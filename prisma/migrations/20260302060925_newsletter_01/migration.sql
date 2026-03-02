-- CreateEnum
CREATE TYPE "public"."NewsletterType" AS ENUM ('BOLLYWOOD', 'HOLLYWOOD');

-- CreateEnum
CREATE TYPE "public"."PaymentProvider" AS ENUM ('STRIPE', 'RAZORPAY');

-- CreateEnum
CREATE TYPE "public"."SubscriberStatus" AS ENUM ('PENDING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'UNSUBSCRIBED');

-- CreateEnum
CREATE TYPE "public"."BillingInterval" AS ENUM ('MONTHLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "public"."PaymentStatus" AS ENUM ('ACTIVE', 'PAST_DUE', 'CANCELED', 'TRIALING');

-- CreateEnum
CREATE TYPE "public"."InvoiceStatus" AS ENUM ('PAID', 'OPEN', 'FAILED', 'VOID');

-- CreateEnum
CREATE TYPE "public"."CampaignStatus" AS ENUM ('DRAFT', 'SCHEDULED', 'SENDING', 'SENT');

-- CreateEnum
CREATE TYPE "public"."EmailLogStatus" AS ENUM ('QUEUED', 'SENT', 'OPENED', 'CLICKED', 'BOUNCED', 'COMPLAINED', 'FAILED');

-- CreateTable
CREATE TABLE "public"."NewsletterPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "public"."NewsletterType" NOT NULL,
    "billingInterval" "public"."BillingInterval" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'inr',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "stripePriceId" TEXT,
    "razorpayPlanId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsletterPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."NewsletterSubscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "userId" TEXT,
    "status" "public"."SubscriberStatus" NOT NULL DEFAULT 'PENDING',
    "country" TEXT,
    "provider" "public"."PaymentProvider",
    "unsubscribeToken" TEXT NOT NULL,
    "unsubscribedAt" TIMESTAMP(3),
    "confirmToken" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsletterSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."NewsletterSubscription" (
    "id" TEXT NOT NULL,
    "subscriberId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "provider" "public"."PaymentProvider" NOT NULL,
    "status" "public"."PaymentStatus" NOT NULL DEFAULT 'ACTIVE',
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "stripePaymentMethodId" TEXT,
    "razorpayCustomerId" TEXT,
    "razorpaySubscriptionId" TEXT,
    "razorpayMandateId" TEXT,
    "razorpayPaymentMethodType" TEXT,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" TIMESTAMP(3),
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastPaymentError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsletterSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."NewsletterPayment" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "provider" "public"."PaymentProvider" NOT NULL,
    "status" "public"."InvoiceStatus" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "stripeInvoiceId" TEXT,
    "stripePaymentIntentId" TEXT,
    "razorpayPaymentId" TEXT,
    "razorpayInvoiceId" TEXT,
    "paidAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsletterPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."NewsletterCampaign" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "previewText" TEXT,
    "content" JSONB NOT NULL,
    "status" "public"."CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "scheduledAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "totalRecipients" INTEGER NOT NULL DEFAULT 0,
    "totalSent" INTEGER NOT NULL DEFAULT 0,
    "totalOpened" INTEGER NOT NULL DEFAULT 0,
    "totalClicked" INTEGER NOT NULL DEFAULT 0,
    "totalBounced" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NewsletterCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."NewsletterEmailLog" (
    "id" TEXT NOT NULL,
    "subscriberId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "sesMessageId" TEXT,
    "status" "public"."EmailLogStatus" NOT NULL DEFAULT 'QUEUED',
    "sentAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "bouncedAt" TIMESTAMP(3),
    "complainedAt" TIMESTAMP(3),
    "bounceType" TEXT,
    "bounceSubType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NewsletterEmailLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_email_key" ON "public"."NewsletterSubscriber"("email");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_userId_key" ON "public"."NewsletterSubscriber"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_unsubscribeToken_key" ON "public"."NewsletterSubscriber"("unsubscribeToken");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscription_stripeSubscriptionId_key" ON "public"."NewsletterSubscription"("stripeSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscription_razorpaySubscriptionId_key" ON "public"."NewsletterSubscription"("razorpaySubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscription_subscriberId_planId_key" ON "public"."NewsletterSubscription"("subscriberId", "planId");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterPayment_stripeInvoiceId_key" ON "public"."NewsletterPayment"("stripeInvoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterPayment_razorpayPaymentId_key" ON "public"."NewsletterPayment"("razorpayPaymentId");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterEmailLog_sesMessageId_key" ON "public"."NewsletterEmailLog"("sesMessageId");

-- CreateIndex
CREATE INDEX "NewsletterEmailLog_subscriberId_idx" ON "public"."NewsletterEmailLog"("subscriberId");

-- CreateIndex
CREATE INDEX "NewsletterEmailLog_campaignId_idx" ON "public"."NewsletterEmailLog"("campaignId");

-- CreateIndex
CREATE INDEX "NewsletterEmailLog_sesMessageId_idx" ON "public"."NewsletterEmailLog"("sesMessageId");

-- CreateIndex
CREATE INDEX "NewsletterEmailLog_status_idx" ON "public"."NewsletterEmailLog"("status");

-- AddForeignKey
ALTER TABLE "public"."NewsletterSubscriber" ADD CONSTRAINT "NewsletterSubscriber_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NewsletterSubscription" ADD CONSTRAINT "NewsletterSubscription_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "public"."NewsletterSubscriber"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NewsletterSubscription" ADD CONSTRAINT "NewsletterSubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "public"."NewsletterPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NewsletterPayment" ADD CONSTRAINT "NewsletterPayment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "public"."NewsletterSubscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NewsletterCampaign" ADD CONSTRAINT "NewsletterCampaign_planId_fkey" FOREIGN KEY ("planId") REFERENCES "public"."NewsletterPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NewsletterEmailLog" ADD CONSTRAINT "NewsletterEmailLog_subscriberId_fkey" FOREIGN KEY ("subscriberId") REFERENCES "public"."NewsletterSubscriber"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."NewsletterEmailLog" ADD CONSTRAINT "NewsletterEmailLog_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."NewsletterCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
