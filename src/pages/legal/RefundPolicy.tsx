import React from "react";
import { Link } from "react-router-dom";
import { PageWrapper } from "./AppLayout";

const H = ({ children }: { children: React.ReactNode }) => <h3 className="text-xl font-bold text-white mb-3 mt-8">{children}</h3>;
const P = ({ children }: { children: React.ReactNode }) => <p className="text-gray-400 leading-relaxed mb-3">{children}</p>;

export default function RefundPolicy() {
  return (
    <PageWrapper title="Refund & Cancellation Policy">
      <P>Last updated: 25 September 2026</P>
      <P>
        This policy explains refunds and cancellations for DateU Premium. DateU itself is free to use; Premium is an optional,
        paid digital service that gives priority placement in matching rounds and random calls for a fixed number of days.
      </P>

      <H>1. No guaranteed matches</H>
      <P>
        Premium improves your visibility and your chances. It does not guarantee any number of matches, replies, calls or dates,
        because every match depends on both people choosing each other. Not getting a match is therefore not a reason for a refund.
      </P>

      <H>2. No refunds once Premium is activated</H>
      <P>
        Premium starts working as soon as it is activated on your account, so payments are non-refundable once Premium has been
        activated — including if you stop using DateU, delete your account, or don't use Premium for the full period.
      </P>

      <H>3. When we do refund</H>
      <P>You will receive a full refund if:</P>
      <ul className="list-disc pl-5 space-y-2 text-gray-400 mb-3">
        <li>you were charged more than once for the same purchase (duplicate payment);</li>
        <li>your payment was successful but Premium was not activated on your account within 48 hours; or</li>
        <li>you were charged an incorrect amount because of a technical error on our side.</li>
      </ul>
      <P>
        Approved refunds are sent to the original payment method (or the UPI ID you paid from) within 7–10 business days.
      </P>

      <H>4. Cancellation</H>
      <P>
        Premium does not renew automatically, so there is nothing to cancel — it simply ends on the date shown in your account.
        Buying Premium again while it is active extends your current period.
      </P>

      <H>5. Accounts suspended for misconduct</H>
      <P>
        If your account is suspended or banned for breaking our{" "}
        <Link to="/legal/guidelines" className="text-rose-400 hover:text-rose-300">Community Guidelines</Link> or{" "}
        <Link to="/legal/terms" className="text-rose-400 hover:text-rose-300">Terms of Service</Link>, any remaining Premium period is not refunded.
      </P>

      <H>6. How to request a refund</H>
      <P>
        Email <a href="mailto:support@dateu.in" className="text-rose-400 hover:text-rose-300">support@dateu.in</a> within
        7 days of the payment with your registered email address, the amount paid, the payment date and the transaction ID /
        UPI reference (UTR) number. We reply within 3 business days.
      </P>
    </PageWrapper>
  );
}
