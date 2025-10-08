import React from "react";
import { PageWrapper } from "./AppLayout";

export default function About() {
  return (
    <PageWrapper title="About Us">
      <p>
        Welcome to dateu.in, a place where new connections begin.
      </p>
      <h3>Our Mission</h3>
      <p>
        Our mission is simple: to create a safe, welcoming, and user-friendly platform that helps people in India find meaningful relationships, whether it's friendship, companionship, or love.
      </p>
      <h3>Our Story</h3>
      <p>
        dateu.in started as a project to solve a simple problem: making it easier for like-minded individuals to meet. As an unincorporated entity, we are driven by passion and the feedback of our users, not by corporate interests.
      </p>
      <h3>What We Stand For</h3>
      <ul>
        <li><strong>Authenticity:</strong> We encourage our users to be their true selves.</li>
        <li><strong>Respect:</strong> Our community is built on a foundation of mutual respect.</li>
        <li><strong>Simplicity:</strong> We've designed our platform to be intuitive and easy to navigate.</li>
      </ul>
      <p>Thank you for joining us on this journey. We're excited to have you as part of our growing community.</p>
    </PageWrapper>
  );
}