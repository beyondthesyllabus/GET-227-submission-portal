'use client'

import { useState, useRef } from 'react'

const DEPARTMENTS = [
  'Mechanical',
  'Civil',
  'Electrical/Electronic',
  'Chemical',
  'Computer',
  'Petroleum',
  'Agricultural',
  'Other'
]

const LEVELS = ['100', '200', '300']

export default function SubmissionForm() {
  const [step, setStep] = useState(1)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [referenceCode, setReferenceCode] = useState('')
  const [errors, setErrors] = useState({})
  
  const [formData, setFormData] = useState({
    groupName: '',
    department: '',
    level: '',
    reg1: '',
    reg2: '',
    reg3: '',
    reg4: '',
    reg5: '',
    projectTitle: '',
    projectFile: [],
    declaration: false
  })

  const fileInputRef = useRef(null)
  const [dragActive, setDragActive] = useState(false)

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    // Clear error when typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateStep1 = () => {
    const newErrors = {}
    if (!formData.groupName) newErrors.groupName = 'Group name is required'
    if (!formData.department) newErrors.department = 'Please select a department'
    if (!formData.level) newErrors.level = 'Please select a level'
    
    // Extract the group number if the group name ends with one
    const groupNumMatch = formData.groupName.trim().match(/\d+$/);
    const groupNum = groupNumMatch ? groupNumMatch[0] : null;

    // Validate exactly 5 registration numbers
    for (let i = 1; i <= 5; i++) {
      const regValue = formData[`reg${i}`].trim()
      if (!regValue) {
        newErrors[`reg${i}`] = `Member ${i} Registration Number is required`
      } else if (groupNum && !regValue.endsWith(groupNum)) {
        newErrors[`reg${i}`] = `Registration number must end with the group number (${groupNum})`
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateStep2 = () => {
    const newErrors = {}
    if (!formData.projectTitle) newErrors.projectTitle = 'Project title is required'
    if (!formData.projectFile) newErrors.projectFile = 'Please upload a project file'
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2)
    } else if (step === 2 && validateStep2()) {
      setStep(3)
    }
  }

  const handleBack = () => {
    setStep(step - 1)
  }

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const handleSubmit = async () => {
    if (!formData.declaration) return
    setSubmitting(true)
    setSubmitError('')

    try {
      const data = new FormData()
      data.append('groupName', formData.groupName)
      data.append('department', formData.department)
      data.append('level', formData.level)
      data.append('projectTitle', formData.projectTitle)
      if (formData.projectFile) data.append('projectFile', formData.projectFile)
      for (let i = 1; i <= 5; i++) {
        data.append(`reg${i}`, formData[`reg${i}`])
      }

      const res = await fetch('/api/submissions', { method: 'POST', body: data })
      const result = await res.json()

      if (!res.ok) throw new Error(result.error || 'Submission failed')

      setReferenceCode(result.referenceCode)
      setIsSubmitted(true)
    } catch (err) {
      setSubmitError(err.message || 'An error occurred. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReset = () => {
    setFormData({
      groupName: '',
      department: '',
      level: '',
      reg1: '',
      reg2: '',
      reg3: '',
      reg4: '',
      reg5: '',
      projectTitle: '',
      projectFile: null,
      declaration: false
    })
    setStep(1)
    setIsSubmitted(false)
    setReferenceCode('')
    setErrors({})
  }

  // Drag and Drop handlers
  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      validateAndSetFile(file)
    }
  }

  const validateAndSetFile = (file) => {
    // Check file extension
    const validExtensions = ['.zip', '.rar', '.sldprt', '.sldasm', '.slddrw', '.step', '.iges', '.pdf']
    const fileName = file.name.toLowerCase()
    const isValid = validExtensions.some(ext => fileName.endsWith(ext))

    if (isValid) {
      setFormData(prev => ({ ...prev, projectFile: file }))
      setErrors(prev => ({ ...prev, projectFile: '' }))
    } else {
      setErrors(prev => ({ ...prev, projectFile: 'Invalid file type. Allowed: .zip, .rar, .sldprt, .sldasm, .slddrw, .step, .iges, .pdf' }))
    }
  }

  if (isSubmitted) {
    return (
      <div className="success-view">
        <div className="success-icon">✓</div>
        <h2>Submission Successful</h2>
        <p>Your project has been successfully submitted. Please save your reference code below:</p>
        <div className="reference-code">{referenceCode}</div>
        <p style={{marginBottom: '2rem'}}>Use this code to track your submission with the department.</p>
        <button onClick={handleReset} className="btn btn-primary">
          Submit another
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="step-indicator">
        <div className={`step ${step >= 1 ? (step > 1 ? 'completed' : 'active') : ''}`}>Group details</div>
        <div className={`step ${step >= 2 ? (step > 2 ? 'completed' : 'active') : ''}`}>Project files</div>
        <div className={`step ${step >= 3 ? 'active' : ''}`}>Declaration</div>
      </div>

      <div style={{ marginBottom: '1.5rem', textAlign: 'right' }}>
        <button onClick={handleReset} className="btn btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}>
          Clear Form
        </button>
      </div>

      {step === 1 && (
        <div className="step-content">
          <div className="form-group">
            <label className="form-label">Group Name <span className="required">*</span></label>
            <input 
              type="text" 
              name="groupName"
              className="form-control"
              value={formData.groupName}
              onChange={handleInputChange}
              placeholder="Enter your group name"
            />
            {errors.groupName && <span className="error-text">{errors.groupName}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Department <span className="required">*</span></label>
            <select 
              name="department" 
              className="form-control"
              value={formData.department}
              onChange={handleInputChange}
            >
              <option value="">Select Department</option>
              {DEPARTMENTS.map(dept => <option key={dept} value={dept}>{dept}</option>)}
            </select>
            {errors.department && <span className="error-text">{errors.department}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Level <span className="required">*</span></label>
            <select 
              name="level" 
              className="form-control"
              value={formData.level}
              onChange={handleInputChange}
            >
              <option value="">Select Level</option>
              {LEVELS.map(level => <option key={level} value={level}>{level}</option>)}
            </select>
            {errors.level && <span className="error-text">{errors.level}</span>}
          </div>

          <h3 style={{ marginTop: '2rem', marginBottom: '1rem', color: 'var(--text-dark)' }}>Group Members</h3>
          <p style={{ fontSize: '0.9rem', color: 'var(--label-color)', marginBottom: '1rem' }}>
            A group must consist of exactly 5 members. Please provide all registration numbers.
          </p>

          {[1, 2, 3, 4, 5].map(num => (
            <div className="form-group" key={num}>
              <label className="form-label">Member {num} Registration Number <span className="required">*</span></label>
              <input 
                type="text" 
                name={`reg${num}`}
                className="form-control"
                value={formData[`reg${num}`]}
                onChange={handleInputChange}
                placeholder="e.g. 2021/ENG/1234"
              />
              {errors[`reg${num}`] && <span className="error-text">{errors[`reg${num}`]}</span>}
            </div>
          ))}
        </div>
      )}

      {step === 2 && (
        <div className="step-content">
          <div className="form-group">
            <label className="form-label">Project / Assignment Title <span className="required">*</span></label>
            <input 
              type="text" 
              name="projectTitle"
              className="form-control"
              value={formData.projectTitle}
              onChange={handleInputChange}
              placeholder="Enter full project title"
            />
            {errors.projectTitle && <span className="error-text">{errors.projectTitle}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Project Folder Upload <span className="required">*</span></label>
            <div 
              className={`upload-zone ${dragActive ? 'drag-active' : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                ref={fileInputRef}
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    validateAndSetFile(e.target.files[0])
                  }
                }}
                accept=".zip,.rar,.sldprt,.sldasm,.slddrw,.step,.iges,.pdf"
              />
              <p>Drag and drop your file here or click to browse</p>
              <div className="file-types">
                Accepted formats: .zip, .rar, .sldprt, .sldasm, .slddrw, .step, .iges, .pdf
              </div>
              
              {formData.projectFile && (
                <div className="filename">
                  Selected File: {formData.projectFile.name}
                </div>
              )}
            </div>
            {errors.projectFile && <span className="error-text" style={{marginTop: '0.5rem'}}>{errors.projectFile}</span>}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="step-content">
          <h3 style={{ marginBottom: '1.5rem', color: 'var(--text-dark)' }}>Final Declaration</h3>
          <p style={{ marginBottom: '1.5rem', color: 'var(--label-color)' }}>
            Please review your submission details. Once submitted, changes cannot be made.
          </p>
          
          <label className="checkbox-container">
            <input 
              type="checkbox" 
              name="declaration"
              checked={formData.declaration}
              onChange={handleInputChange}
            />
            <span style={{color: 'var(--text-dark)', fontWeight: '500'}}>
              We declare that this submission is our own original work and that all group members listed have agreed to this submission.
            </span>
          </label>
        </div>
      )}

      {step === 3 && submitError && (
        <div style={{ marginBottom: '1rem', padding: '0.75rem 1rem', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '6px', color: 'var(--error-color)', fontSize: '0.9rem' }}>
          {submitError}
        </div>
      )}

      <div className="btn-group">
        {step > 1 ? (
          <button onClick={handleBack} className="btn btn-secondary">
            Back
          </button>
        ) : (
          <div></div>
        )}
        
        {step < 3 ? (
          <button onClick={handleNext} className="btn btn-primary">
            Continue
          </button>
        ) : (
          <button 
            onClick={handleSubmit} 
            className="btn btn-primary"
            disabled={!formData.declaration || submitting}
          >
            {submitting ? 'Submitting...' : 'Submit assignment'}
          </button>
        )}
      </div>
    </div>
  )
}
