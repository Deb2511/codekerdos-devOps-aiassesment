import React, { useState } from 'react';
import './StudentForm.css';

interface StudentFormProps {
  onNext: (name: string, email: string) => void;
  onBack: () => void;
  assessmentType: 'self' | 'jd';
}

export const StudentForm: React.FC<StudentFormProps> = ({ onNext, onBack, assessmentType }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateEmail = (email: string): boolean => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleNext = () => {
    const newErrors: Record<string, string> = {};

    if (name.trim().length === 0) {
      newErrors.name = 'Name is required';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (email.trim().length === 0) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onNext(name.trim(), email.trim());
  };

  return (
    <div className="student-form-container">
      <div className="student-form-card">
        <h2>Get Started</h2>
        <p className="form-subtitle">
          {assessmentType === 'self'
            ? 'Test your DevOps knowledge with a self-paced assessment'
            : 'Evaluate your fit for a specific DevOps role'}
        </p>

        <div className="form-group">
          <label htmlFor="name-input">Full Name *</label>
          <input
            id="name-input"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setErrors({ ...errors, name: '' });
            }}
            placeholder="Enter your full name"
            className={errors.name ? 'input-error' : ''}
          />
          {errors.name && <span className="error-text">{errors.name}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="email-input">Email Address *</label>
          <input
            id="email-input"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setErrors({ ...errors, email: '' });
            }}
            placeholder="Enter your email address"
            className={errors.email ? 'input-error' : ''}
          />
          {errors.email && <span className="error-text">{errors.email}</span>}
        </div>

        <p className="form-note">
          📝 Your results will be saved using this email address so you can view them later.
        </p>

        <div className="button-group">
          <button className="btn btn-secondary" onClick={onBack}>
            ← Back
          </button>
          <button className="btn btn-primary" onClick={handleNext}>
            Continue →
          </button>
        </div>
      </div>
    </div>
  );
};
