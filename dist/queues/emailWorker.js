"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailWorker = void 0;
const bullmq_1 = require("bullmq");
const client_ses_1 = require("@aws-sdk/client-ses");
const index_js_1 = __importDefault(require("../index.js")); // your prisma client
const logger_js_1 = __importDefault(require("../logger.js"));
const sesClient = new client_ses_1.SESClient({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});
const connection = {
    url: process.env.REDIS_URL,
};
const processEmail = async (job) => {
    const { subscriberId, campaignId, email, name, subject, htmlContent, unsubscribeToken, } = job.data;
    logger_js_1.default.info(`Processing email job ${job.id} for ${email}`);
    // Build unsubscribe URL - appended to every email (CAN-SPAM requirement)
    const unsubscribeUrl = `${process.env.FRONTEND_URL}/unsubscribe?token=${unsubscribeToken}`;
    // Inject unsubscribe link into HTML before sending
    const finalHtml = htmlContent.replace("{{UNSUBSCRIBE_URL}}", unsubscribeUrl);
    const params = {
        Source: `The Cineprism <${process.env.SES_FROM_EMAIL}>`,
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
        // This ties the send to your configuration set for open/click tracking
        ConfigurationSetName: "cineprism-newsletter",
    };
    const command = new client_ses_1.SendEmailCommand(params);
    const result = await sesClient.send(command);
    const sesMessageId = result.MessageId;
    // Update email log with sent status and SES message ID
    await index_js_1.default.newsletterEmailLog.updateMany({
        where: {
            subscriberId,
            campaignId,
        },
        data: {
            status: "SENT",
            sesMessageId,
            sentAt: new Date(),
        },
    });
    // Increment campaign sent count
    await index_js_1.default.newsletterCampaign.update({
        where: { id: campaignId },
        data: {
            totalSent: { increment: 1 },
        },
    });
    logger_js_1.default.info(`Email sent to ${email}, SES ID: ${sesMessageId}`);
    return { sesMessageId };
};
// Create the worker - this runs in the background processing jobs
exports.emailWorker = new bullmq_1.Worker("newsletter-emails", processEmail, {
    connection,
    concurrency: 5, // process 5 emails at a time - adjust based on SES sending rate
});
// Worker event handlers for logging
exports.emailWorker.on("completed", (job) => {
    logger_js_1.default.info(`Email job ${job.id} completed`);
});
exports.emailWorker.on("failed", async (job, error) => {
    logger_js_1.default.error(`Email job ${job?.id} failed: ${error.message}`);
    if (job) {
        // If all retries exhausted, mark as failed in DB
        if (job.attemptsMade >= (job.opts.attempts || 3)) {
            await index_js_1.default.newsletterEmailLog.updateMany({
                where: {
                    subscriberId: job.data.subscriberId,
                    campaignId: job.data.campaignId,
                },
                data: {
                    status: "FAILED",
                },
            });
        }
    }
});
exports.emailWorker.on("error", (error) => {
    logger_js_1.default.error(`Email worker error: ${error.message}`);
});
logger_js_1.default.info("Email worker started and listening for jobs");
