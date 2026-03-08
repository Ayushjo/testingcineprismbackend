export interface CreateSubscriberInput {
  email: string;
  name?: string;
  userId?: string;
  country: string; // "IN" | "US" etc.
  planId: string;
}

export interface CreateCheckoutInput {
  subscriberId: string;
  planId: string;
  provider: "RAZORPAY" | "STRIPE";
}

export interface RazorpayWebhookPayload {
  entity: string;
  account_id: string;
  event: string;
  contains: string[];
  payload: {
    subscription?: {
      entity: {
        id: string;
        plan_id: string;
        customer_id: string;
        status: string;
        current_start: number;
        current_end: number;
        charge_at: number;
      };
    };
    payment?: {
      entity: {
        id: string;
        amount: number;
        currency: string;
        status: string;
        invoice_id: string;
        error_description?: string;
      };
    };
  };
}

export interface EmailJobData {
  subscriberId: string;
  campaignId: string;
  email: string;
  name: string | null;
  subject: string;
  htmlContent: string;
  unsubscribeToken: string;
}

export interface SNSBounceNotification {
  notificationType: "Bounce" | "Complaint";
  bounce?: {
    bounceType: string;
    bounceSubType: string;
    bouncedRecipients: { emailAddress: string }[];
    timestamp: string;
  };
  complaint?: {
    complainedRecipients: { emailAddress: string }[];
    timestamp: string;
  };
  mail: {
    messageId: string;
    destination: string[];
  };
}
