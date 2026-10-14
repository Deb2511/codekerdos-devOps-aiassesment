import React from 'react';
import './LandingPage.css';

interface LandingPageProps {
  onSelectSelf: () => void;
  onSelectJD: () => void;
  onSelectLeaderboard: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onSelectSelf, onSelectJD, onSelectLeaderboard }) => {
  return (
    <div className="landing-container">
      <div className="landing-header">
        <img src={`${process.env.PUBLIC_URL}/footer-logo.png`} alt="CodeKerdos logo" className="brand-logo" />
        <h1>CodeKerdos DevOps Assessment</h1>
        <p>Evaluate your DevOps skills with scenario-based questions</p>
      </div>

      <div className="options-grid">
        <div className="option-card" onClick={onSelectSelf}>
          <h2>Self Assessment</h2>
          <p>Test your knowledge across fundamental DevOps topics</p>
          <ul className="topics-list">
            <li>Linux</li>
            <li>Networking</li>
            <li>Git</li>
            <li>AWS</li>
            <li>Terraform</li>
            <li>Docker</li>
            <li>Kubernetes</li>
            <li>CI/CD</li>
            <li>Observability</li>
            <li>SRE</li>
          </ul>
          <button className="btn btn-primary">Start Self Assessment →</button>
        </div>

        <div className="option-card" onClick={onSelectJD}>
          <h2>JD-Based Assessment</h2>
          <p>Get evaluated against a specific job description</p>
          <div className="jd-info">
            <p>Paste your DevOps job description and receive custom questions tailored to the role requirements.</p>
          </div>
          <button className="btn btn-primary">Assess for JD →</button>
        </div>

        <div className="option-card" onClick={onSelectLeaderboard}>
          <h2>Leaderboard</h2>
          <p>See how you rank among peers</p>
          <div className="leaderboard-info">
            <p>View monthly rankings of top performers and track your progress across assessments.</p>
          </div>
          <button className="btn btn-primary">View Leaderboard →</button>
        </div>
      </div>

      <footer className="landing-footer">
        <img src={`${process.env.PUBLIC_URL}/footer-logo.png`} alt="CodeKerdos logo" className="footer-logo" />
        <span>CodeKerdos DevOps Assessment Platform</span>
      </footer>
    </div>
  );
};
