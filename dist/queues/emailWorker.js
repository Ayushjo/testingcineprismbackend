"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailWorker = exports.processEmail = exports.emailWorkerConnection = void 0;
const bullmq_1 = require("bullmq");
const client_ses_1 = require("@aws-sdk/client-ses");
const client_1 = require("@prisma/client");
const logger_js_1 = __importDefault(require("../logger.js"));
const client = new client_1.PrismaClient();
const sesClient = new client_ses_1.SESClient({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});
const redisUrl = process.env.REDIS_URL;
exports.emailWorkerConnection = {
    url: redisUrl,
    maxRetriesPerRequest: null, // required by BullMQ
    enableReadyCheck: false,
    ...(redisUrl?.startsWith("rediss://")
        ? { tls: { rejectUnauthorized: false } }
        : {}),
};
const connection = exports.emailWorkerConnection;
const FROM_ADDRESS = process.env.SES_FROM_EMAIL || "newsletter@thecineprism.com";
const processEmail = async (job) => {
    const { subscriberId, campaignId, email, subject, htmlContent, unsubscribeToken, } = job.data;
    logger_js_1.default.info(`Processing email job ${job.id} for ${email}`);
    try {
        const frontendUrl = (process.env.FRONTEND_URL || "").replace(/\/$/, "");
        const unsubscribeUrl = `${frontendUrl}/unsubscribe?token=${unsubscribeToken}`;
        // Replace placeholder after HTML is built (supports multiple footer links)
        const finalHtml = htmlContent.replace(/\{\{UNSUBSCRIBE_URL\}\}/g, unsubscribeUrl);
        const params = {
            Source: `The Cineprism <${FROM_ADDRESS}>`,
            Destination: {
                ToAddresses: [email],
            },
            Message: {
                Subject: {
                    Data: subject,
                    Charset: "UTF-8",
                },
                Body: {
                    Html: {
                        Data: finalHtml,
                        Charset: "UTF-8",
                    },
                },
            },
            ConfigurationSetName: "cineprism-newsletter",
        };
        const command = new client_ses_1.SendEmailCommand(params);
        const result = await sesClient.send(command);
        const sesMessageId = result.MessageId;
        // Transactional emails (welcome, etc.) have no campaignId — skip log/stats
        if (campaignId) {
            await client.newsletterEmailLog.updateMany({
                where: { subscriberId, campaignId },
                data: {
                    status: "SENT",
                    sesMessageId,
                    sentAt: new Date(),
                },
            });
            await client.newsletterCampaign.update({
                where: { id: campaignId },
                data: { totalSent: { increment: 1 } },
            });
        }
        logger_js_1.default.info(`Email sent to ${email}, SES ID: ${sesMessageId}`);
        return { sesMessageId };
    }
    catch (error) {
        logger_js_1.default.error(`Failed to send email to ${email}: ${error.message}`);
        throw error;
    }
};
exports.processEmail = processEmail;
// Create the worker - this runs in the background processing jobs
exports.emailWorker = new bullmq_1.Worker("newsletter-emails", exports.processEmail, {
    connection,
    concurrency: 5, // process 5 emails at a time - adjust based on SES sending rate
});
// Worker event handlers for logging
exports.emailWorker.on("completed", (job) => {
    logger_js_1.default.info(`Email job ${job.id} completed`);
});
exports.emailWorker.on("failed", async (job, error) => {
    logger_js_1.default.error(`Email job ${job?.id} failed: ${error.message}`);
    if (job && job.attemptsMade >= (job.opts.attempts || 3)) {
        // Only update campaign email logs — transactional emails have no log row
        if (job.data.campaignId) {
            await client.newsletterEmailLog.updateMany({
                where: {
                    subscriberId: job.data.subscriberId,
                    campaignId: job.data.campaignId,
                },
                data: { status: "FAILED" },
            });
        }
    }
});
exports.emailWorker.on("error", (error) => {
    // Log Redis/connection errors without crashing the process — BullMQ reconnects
    logger_js_1.default.error(`Email worker connection error (will retry): ${error.message}`);
});
process.on("unhandledRejection", (reason) => {
    logger_js_1.default.error(`Email worker unhandled rejection: ${reason}`);
});
logger_js_1.default.info("Email worker started and listening for jobs");
