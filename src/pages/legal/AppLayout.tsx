import React from "react";

type PageWrapperProps = {
  title: React.ReactNode;
  children: React.ReactNode;
};

export const PageWrapper = ({ title, children }: PageWrapperProps) => (
  <div className="page-wrapper">
    <div className="page-title">{title}</div>
    <div className="page-content">{children}</div>
  </div>
);