import React from "react";
import { Link } from "react-router-dom";
import { PageWrapper } from "./AppLayout";

const H = ({ children }: { children: React.ReactNode }) => <h3 className="text-xl font-bold text-white mb-3 mt-8">{children}</h3>;
const P = ({ children }: { children: React.ReactNode }) => <p className="text-gray-400 leading-relaxed mb-3">{children}</p>;

export default function DeliveryPolicy() {
  return (
    <PageWrapper title="Shipping & Delivery Policy">
      <P>Last updated: 25 September 2026</P>

      <H>Digital service — nothing is shipped</H>
      <P>
        DateU sells no physical products. DateU Premium is a digital service that is delivered to your DateU account,
        which you use at <a href="https://dateu.in" className="text-rose-400 hover:text-rose-300">dateu.in</a> and in our app.
      </P>

      <H>When Premium is delivered</H>
      <P>
        Premium is activated on your account once your payment is confirmed. This usually happens within a few hours of payment,
        and always within 48 hours. You'll get a notification in the app when it's active, and the end date appears on the
        Premium page.
      </P>

      <H>If it isn't activated</H>
      <P>
        If Premium is not active within 48 hours of a successful payment, email{" "}
        <a href="mailto:support@dateu.in" className="text-rose-400 hover:text-rose-300">support@dateu.in</a> with your payment
        details. We'll activate it or give you a full refund, as described in our{" "}
        <Link to="/legal/refunds" className="text-rose-400 hover:text-rose-300">Refund &amp; Cancellation Policy</Link>.
      </P>
    </PageWrapper>
  );
}
