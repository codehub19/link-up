import React from "react";
import { PageWrapper } from "./AppLayout";
import { useNavigate } from "react-router-dom";


export default function Legal() {
  const navigate = useNavigate();

  return (
    <PageWrapper title="Legal Information">
      <p>
        This page provides an overview of the legal agreements and policies that govern your use of the dateu.in platform. By accessing or using our services, you agree to be bound by these documents.
      </p>
      <p className="text-muted" style={{marginBottom: "1.5rem"}}>It is your responsibility to read and understand them fully.</p>

      <div>
        <div className="card">
          <h3>
            <a onClick={() => navigate("/terms")}>Terms and Conditions</a>
          </h3>
          <p>
            This document outlines the rules for using our platform, your rights and responsibilities, our role as a platform provider, and the limitations of our liability. Your use of our service is contingent upon your agreement to these terms.
          </p>
        </div>
        <div className="card">
          <h3>
            <a onClick={() => navigate("/privacy")}>Privacy Policy</a>
          </h3>
          <p>
            This policy details what personal information we collect from you, how we use it, with whom we may share it, and the measures we take to protect it. We are committed to safeguarding your privacy.
          </p>
        </div>
        <div className="card">
          <h3>
            <a onClick={() => navigate("/cookies")}>Cookies Policy</a>
          </h3>
          <p>
            This document explains what cookies are, how we use them on our website to improve your experience, and your choices regarding their use.
          </p>
        </div>
        <div className="card">
          <h3>
            <a onClick={() => navigate("/community")}>Community Guidelines</a>
          </h3>
          <p>
            These are the rules of conduct for all members of the dateu.in community. They are designed to ensure a safe and respectful environment for everyone. Violations may result in account suspension or termination.
          </p>
        </div>
      </div>
      <p style={{marginTop: "2rem", fontWeight: "bold"}} className="text-accent">
        These documents are legally binding. If you do not agree with any part of them, you must not use our services.
      </p>
    </PageWrapper>
  );
}