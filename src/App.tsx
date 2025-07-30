import { useState } from 'react'
import { splitCsv, createCsvBlob, downloadCsv, validateAndNormalizeCsv } from './utils/csvUtils'
import frontLogo from './assets/front-mark.svg'
import githubLogo from './assets/github-mark.svg'
import './App.css'

const DEFAULT_MAX_LINES_PER_FILE = 3_000

function App() {
  const [csvContent, setCsvContent] = useState('')
  const [maxLinesPerFile, setMaxLinesPerFile] = useState(DEFAULT_MAX_LINES_PER_FILE)
  const [includeHeader, setIncludeHeader] = useState(true)
  const [splitResult, setSplitResult] = useState<{ chunks: string[]; totalChunks: number; originalLineCount: number } | null>(null)
  const [error, setError] = useState('')

  // Calculate total lines in uploaded CSV
  const totalLines = csvContent ? csvContent.trim().split('\n').length : 0

  // Calculate how many files will be generated
  const calculateChunkCount = () => {
    if (!csvContent || totalLines === 0) return 0
    
    const lines = csvContent.trim().split('\n')
    const dataLines = lines.slice(1) // Exclude header
    
    if (dataLines.length === 0) return 1 // Only header
    
    const effectiveMaxLines = includeHeader ? maxLinesPerFile - 1 : maxLinesPerFile
    return Math.ceil(dataLines.length / effectiveMaxLines)
  }

  const estimatedChunkCount = calculateChunkCount()

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      setCsvContent(content)
      setError('')
      setSplitResult(null)
    }
    reader.readAsText(file)
  }

  const handleSplit = () => {
    try {
      if (!csvContent) {
        setError('Please upload a CSV file first')
        return
      }

      const validationResult = validateAndNormalizeCsv(csvContent)
      
      if (!validationResult.isValid) {
        setError(`The uploaded file does not appear to be a valid CSV: ${validationResult.issues.join(', ')}`)
        return
      }

      // Use the normalized content (which may have had a trailing newline added)
      const contentToUse = validationResult.normalizedContent
      
      // Update the stored content if it was normalized
      if (contentToUse !== csvContent) {
        setCsvContent(contentToUse)
      }

      const result = splitCsv(contentToUse, {
        maxLinesPerFile,
        includeHeader
      })

      setSplitResult(result)
      setError('')
      
      // Show info about any normalizations that were applied
      if (validationResult.issues.length > 0) {
        console.log('CSV normalization applied:', validationResult.issues.join(', '))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while splitting the CSV')
    }
  }

  const handleDownloadChunk = (chunkIndex: number) => {
    if (!splitResult) return

    const chunk = splitResult.chunks[chunkIndex]
    const filename = `split-${chunkIndex + 1}-of-${splitResult.totalChunks}`
    const blobInfo = createCsvBlob(chunk, filename)
    downloadCsv(blobInfo)
  }

  const handleDownloadAll = () => {
    if (!splitResult) return

    splitResult.chunks.forEach((_, index) => {
      setTimeout(() => handleDownloadChunk(index), index * 100) // Small delay between downloads
    })
  }

  return (
    <>
      <div className="header-links">
        <a href="https://front.com" target="_blank" className="header-link">
          <img src={frontLogo} alt="Front.com" className="link-icon" />
          Front.com
        </a>
        <a href="https://github.com/dugjason/split-csv" target="_blank" className="header-link">
          <img src={githubLogo} alt="GitHub" className="link-icon" />
          GitHub
        </a>
      </div>
      <div className="app">
        <header>
          <h1>CSV Splitter</h1>
          <p>Upload a CSV file and split it into smaller files</p>
          <div className="description">
            <p>
              <strong>🔒 Privacy-first:</strong> All processing happens entirely in your browser. 
              Your CSV data never leaves your device and is not sent to any server.
            </p>
            <p>
              <strong>📱 Works offline:</strong> No internet connection required after loading the page. 
              Split your files anytime, anywhere.
            </p>
          </div>
        </header>

      <main>
        <div className="upload-section">
          <label htmlFor="csv-upload" className="upload-label">
            Choose CSV File
          </label>
          <input
            id="csv-upload"
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="file-input"
          />
        </div>

        <div className="options-section">
          <div className="option-group">
            <label htmlFor="max-lines">
              Max lines per file:
            </label>
            <input
              id="max-lines"
              type="number"
              value={maxLinesPerFile}
              onChange={(e) => setMaxLinesPerFile(Number(e.target.value))}
              min="1"
              className="number-input"
            />
          </div>

          <div className="option-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={includeHeader}
                onChange={(e) => setIncludeHeader(e.target.checked)}
              />
              Include header in each file
            </label>
          </div>
        </div>

        <div className="dynamic-content-area">
          {csvContent && (
            <div className="preview-section">
              <h3>File Preview</h3>
              <div className="file-info">
                <p><strong>Total lines in CSV:</strong> {totalLines.toLocaleString()}</p>
                <p><strong>Estimated files to be generated:</strong> {estimatedChunkCount.toLocaleString()}</p>
              </div>
              <div className="csv-preview">
                <pre>{csvContent.split('\n').slice(0, 5).join('\n')}</pre>
                {csvContent.split('\n').length > 5 && <p>... and {csvContent.split('\n').length - 5} more lines</p>}
              </div>
            </div>
          )}
        </div>

        <div className="action-section">
          <button
            onClick={handleSplit}
            disabled={!csvContent}
            className="split-button"
          >
            Split CSV
          </button>
        </div>

        <div className="dynamic-content-area">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}
        </div>

        <div className="dynamic-content-area">
          {splitResult && (
            <div className="results-section">
              <h3>Split Results</h3>
              <div className="result-info">
                <p>Original file: {splitResult.originalLineCount} lines</p>
                <p>Split into: {splitResult.totalChunks} files</p>
              </div>

              <div className="download-section">
                <button onClick={handleDownloadAll} className="download-all-button">
                  Download All Files
                </button>

                <div className="chunk-list">
                  {splitResult.chunks.map((chunk, index) => {
                    const lineCount = chunk.split('\n').length
                    return (
                      <div key={index} className="chunk-item">
                        <span>File {index + 1}: {lineCount} lines</span>
                        <button
                          onClick={() => handleDownloadChunk(index)}
                          className="download-button"
                        >
                          Download
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
    </>
  )
}

export default App
