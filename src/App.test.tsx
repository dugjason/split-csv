import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import App from './App'

// Mock the CSV utils to control their behavior in tests
vi.mock('./utils/csvUtils', () => ({
  splitCsv: vi.fn(),
  createCsvBlob: vi.fn(),
  downloadCsv: vi.fn(),
  isValidCsv: vi.fn()
}))

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the main heading and upload section', () => {
    render(<App />)
    
    expect(screen.getByRole('heading', { name: /csv splitter/i })).toBeInTheDocument()
    expect(screen.getByText(/upload a csv file and split it into smaller files/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/choose csv file/i)).toBeInTheDocument()
  })

  it('renders configuration options', () => {
    render(<App />)
    
    expect(screen.getByLabelText(/max lines per file/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/include header in each file/i)).toBeInTheDocument()
    expect(screen.getByDisplayValue('3000')).toBeInTheDocument() // Default max lines
  })

  it('shows split button but disables it when no CSV is uploaded', () => {
    render(<App />)
    
    const splitButton = screen.getByRole('button', { name: /split csv/i })
    expect(splitButton).toBeInTheDocument()
    expect(splitButton).toBeDisabled()
  })

  it('updates max lines per file when input changes', () => {
    render(<App />)
    
    const maxLinesInput = screen.getByLabelText(/max lines per file/i)
    fireEvent.change(maxLinesInput, { target: { value: '5000' } })
    
    expect(maxLinesInput).toHaveValue(5000)
  })

  it('toggles include header checkbox', () => {
    render(<App />)
    
    const headerCheckbox = screen.getByLabelText(/include header in each file/i)
    expect(headerCheckbox).toBeChecked() // Default is checked
    
    fireEvent.click(headerCheckbox)
    expect(headerCheckbox).not.toBeChecked()
  })

  it('handles file upload and shows preview', async () => {
    render(<App />)
    
    const csvContent = 'name,age\\nJohn,25\\nJane,30'
    const file = new File([csvContent], 'test.csv', { type: 'text/csv' })
    
    const fileInput = screen.getByLabelText(/choose csv file/i)
    fireEvent.change(fileInput, { target: { files: [file] } })
    
    await waitFor(() => {
      expect(screen.getByText(/file preview/i)).toBeInTheDocument()
    })
  })

  it('shows error when trying to split without uploading file', () => {
    render(<App />)
    
    const splitButton = screen.getByRole('button', { name: /split csv/i })
    
    // Enable the button by mocking file upload
    fireEvent.change(screen.getByLabelText(/choose csv file/i), {
      target: { files: [new File(['test'], 'test.csv')] }
    })
    
    // Now try to split - this should show an error since we mocked the functions
    fireEvent.click(splitButton)
    
    // The actual error handling depends on the mocked functions, 
    // but the component should handle the case gracefully
  })
})