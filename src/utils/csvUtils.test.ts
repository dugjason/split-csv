import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { splitCsv, createCsvBlob, downloadCsv, isValidCsv, validateAndNormalizeCsv, type CsvSplitOptions } from './csvUtils'

describe('csvUtils', () => {
  describe('splitCsv', () => {
    const sampleCsv = `name,age,city
John,25,New York
Jane,30,Los Angeles
Bob,35,Chicago
Alice,28,Miami
Tom,32,Seattle
Sarah,27,Boston
Mike,29,Denver
Lisa,31,Phoenix`

    const defaultOptions: CsvSplitOptions = {
      maxLinesPerFile: 3,
      includeHeader: true
    }

    it('should split CSV into correct number of chunks with header', () => {
      const result = splitCsv(sampleCsv, defaultOptions)
      
      expect(result.totalChunks).toBe(4) // 8 data lines / 2 effective lines per chunk = 4 chunks  
      expect(result.originalLineCount).toBe(9) // 1 header + 8 data lines
      expect(result.chunks).toHaveLength(4)
    })

    it('should include header in each chunk when includeHeader is true', () => {
      const result = splitCsv(sampleCsv, defaultOptions)
      
      result.chunks.forEach(chunk => {
        expect(chunk).toMatch(/^name,age,city/)
      })
    })

    it('should not include header when includeHeader is false', () => {
      const options: CsvSplitOptions = {
        maxLinesPerFile: 3,
        includeHeader: false
      }
      
      const result = splitCsv(sampleCsv, options)
      
      result.chunks.forEach(chunk => {
        expect(chunk).not.toMatch(/^name,age,city/)
      })
    })

    it('should handle CSV with exact chunk size', () => {
      const smallCsv = `name,age
John,25
Jane,30`
      
      const options: CsvSplitOptions = {
        maxLinesPerFile: 3, // 1 header + 2 data = exactly 3 lines
        includeHeader: true
      }
      
      const result = splitCsv(smallCsv, options)
      
      expect(result.totalChunks).toBe(1)
      expect(result.chunks[0]).toBe(smallCsv)
    })

    it('should handle CSV larger than chunk size', () => {
      const options: CsvSplitOptions = {
        maxLinesPerFile: 4, // 1 header + 3 data lines per chunk
        includeHeader: true
      }
      
      const result = splitCsv(sampleCsv, options)
      
      expect(result.totalChunks).toBe(3) // 8 data lines / 3 = 2.67, rounded up to 3
      
      // First chunk should have header + 3 data lines
      const firstChunkLines = result.chunks[0].split('\n')
      expect(firstChunkLines).toHaveLength(4)
      expect(firstChunkLines[0]).toBe('name,age,city')
      
      // Last chunk might have fewer lines
      const lastChunkLines = result.chunks[result.chunks.length - 1].split('\n')
      expect(lastChunkLines.length).toBeGreaterThan(1) // At least header + 1 data line
    })

    it('should handle single line CSV (header only)', () => {
      const headerOnlyCsv = 'name,age,city'
      const result = splitCsv(headerOnlyCsv, defaultOptions)
      
      expect(result.totalChunks).toBe(1)
      expect(result.chunks[0]).toBe('name,age,city')
      expect(result.originalLineCount).toBe(1)
    })

    it('should throw error for empty CSV content', () => {
      expect(() => splitCsv('', defaultOptions)).toThrow('CSV content cannot be empty')
      expect(() => splitCsv('   ', defaultOptions)).toThrow('CSV content cannot be empty')
    })

    it('should throw error for invalid maxLinesPerFile', () => {
      const invalidOptions: CsvSplitOptions = {
        maxLinesPerFile: 0,
        includeHeader: true
      }
      
      expect(() => splitCsv(sampleCsv, invalidOptions)).toThrow('maxLinesPerFile must be greater than 0')
    })

    it('should handle CSV with different line endings', () => {
      const csvWithCRLF = sampleCsv.replace(/\n/g, '\r\n')
      const result = splitCsv(csvWithCRLF, defaultOptions)
      
      expect(result.originalLineCount).toBe(9)
      expect(result.chunks).toHaveLength(4)
    })

    it('should preserve data integrity in chunks', () => {
      const result = splitCsv(sampleCsv, defaultOptions)
      
      // Extract all data lines from chunks (excluding headers)
      const allDataFromChunks: string[] = []
      result.chunks.forEach(chunk => {
        const lines = chunk.split('\n')
        if (defaultOptions.includeHeader) {
          allDataFromChunks.push(...lines.slice(1)) // Skip header
        } else {
          allDataFromChunks.push(...lines)
        }
      })
      
      const originalDataLines = sampleCsv.split('\n').slice(1)
      expect(allDataFromChunks).toEqual(originalDataLines)
    })
  })

  describe('createCsvBlob', () => {
    beforeEach(() => {
      // Mock URL.createObjectURL for the test environment
      vi.stubGlobal('URL', {
        createObjectURL: vi.fn().mockReturnValue('blob://mock-url'),
        revokeObjectURL: vi.fn()
      })
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('should create blob with correct type', () => {
      const content = 'name,age\nJohn,25'
      const result = createCsvBlob(content, 'test')
      
      expect(result.blob.type).toBe('text/csv;charset=utf-8;')
      expect(result.filename).toBe('test.csv')
      expect(result.url).toBe('blob://mock-url')
    })

    it('should add .csv extension if not present', () => {
      const result = createCsvBlob('test', 'filename')
      expect(result.filename).toBe('filename.csv')
    })

    it('should not duplicate .csv extension', () => {
      const result = createCsvBlob('test', 'filename.csv')
      expect(result.filename).toBe('filename.csv')
    })
  })

  describe('downloadCsv', () => {
    beforeEach(() => {
      // Mock DOM elements and methods
      vi.stubGlobal('document', {
        createElement: vi.fn(() => ({
          href: '',
          download: '',
          style: { display: '' },
          click: vi.fn()
        })),
        body: {
          appendChild: vi.fn(),
          removeChild: vi.fn()
        }
      })
      
      vi.stubGlobal('URL', {
        revokeObjectURL: vi.fn()
      })
    })

    afterEach(() => {
      vi.unstubAllGlobals()
    })

    it('should create and trigger download link', () => {
      const mockLink = {
        href: '',
        download: '',
        style: { display: '' },
        click: vi.fn()
      }
      
      const mockDocument = {
        createElement: vi.fn().mockReturnValue(mockLink),
        body: {
          appendChild: vi.fn(),
          removeChild: vi.fn()
        }
      }
      
      vi.stubGlobal('document', mockDocument)
      
      const blobInfo = {
        url: 'blob://test-url',
        filename: 'test.csv'
      }
      
      downloadCsv(blobInfo)
      
      expect(mockDocument.createElement).toHaveBeenCalledWith('a')
      expect(mockLink.href).toBe('blob://test-url')
      expect(mockLink.download).toBe('test.csv')
      expect(mockLink.style.display).toBe('none')
      expect(mockDocument.body.appendChild).toHaveBeenCalledWith(mockLink)
      expect(mockLink.click).toHaveBeenCalled()
      expect(mockDocument.body.removeChild).toHaveBeenCalledWith(mockLink)
    })
  })

  describe('isValidCsv', () => {
    it('should return true for valid CSV', () => {
      const validCsv = `name,age,city
John,25,New York
Jane,30,Los Angeles`
      
      expect(isValidCsv(validCsv)).toBe(true)
    })

    it('should return false for empty content', () => {
      expect(isValidCsv('')).toBe(false)
      expect(isValidCsv('   ')).toBe(false)
    })

    it('should return true for single line CSV', () => {
      expect(isValidCsv('name,age,city')).toBe(true)
    })

    it('should return false for inconsistent column count', () => {
      const invalidCsv = `name,age,city
John,25
Jane,30,Los Angeles,Extra`
      
      expect(isValidCsv(invalidCsv)).toBe(false)
    })

    it('should return true for CSV without commas (single column)', () => {
      const singleColumnCsv = `name
John
Jane`
      
      expect(isValidCsv(singleColumnCsv)).toBe(true)
    })

    it('should handle CSV with quoted values containing commas', () => {
      // Our improved validator can now handle quoted fields containing commas
      const csvWithQuotedCommas = `name,description
John,"A person, who likes coding"
Jane,"Another person, who likes design"`
      
      // The improved validator should now pass this case
      expect(isValidCsv(csvWithQuotedCommas)).toBe(true)
    })
  })

  describe('validateAndNormalizeCsv', () => {
    it('should validate and normalize valid CSV', () => {
      const validCsv = `name,age,city
John,25,New York
Jane,30,Los Angeles`
      
      const result = validateAndNormalizeCsv(validCsv)
      
      expect(result.isValid).toBe(true)
      expect(result.normalizedContent).toBe(validCsv + '\n')
      expect(result.issues).toEqual(['Added missing trailing newline'])
    })

    it('should handle CSV that already ends with newline', () => {
      const validCsv = `name,age,city
John,25,New York
Jane,30,Los Angeles
`
      
      const result = validateAndNormalizeCsv(validCsv)
      
      expect(result.isValid).toBe(true)
      expect(result.normalizedContent).toBe(validCsv)
      expect(result.issues).toEqual([])
    })

    it('should handle CSV with quoted values containing commas', () => {
      const csvWithQuotedCommas = `name,description
John,"A person, who likes coding"
Jane,"Another person, who likes design"`
      
      const result = validateAndNormalizeCsv(csvWithQuotedCommas)
      
      expect(result.isValid).toBe(true)
      expect(result.normalizedContent).toBe(csvWithQuotedCommas + '\n')
      expect(result.issues).toEqual(['Added missing trailing newline'])
    })

    it('should handle CSV with quoted values containing quotes', () => {
      const csvWithQuotedQuotes = `name,quote
John,"He said ""Hello"" to me"
Jane,"She replied ""Hi there!"""`
      
      const result = validateAndNormalizeCsv(csvWithQuotedQuotes)
      
      expect(result.isValid).toBe(true)
      expect(result.normalizedContent).toBe(csvWithQuotedQuotes + '\n')
      expect(result.issues).toEqual(['Added missing trailing newline'])
    })

    it('should reject empty content', () => {
      const result = validateAndNormalizeCsv('')
      
      expect(result.isValid).toBe(false)
      expect(result.issues).toContain('CSV content cannot be empty')
    })

    it('should reject CSV with inconsistent column count', () => {
      const invalidCsv = `name,age,city
John,25
Jane,30,Los Angeles,Extra`
      
      const result = validateAndNormalizeCsv(invalidCsv)
      
      expect(result.isValid).toBe(false)
      expect(result.issues.some(issue => issue.includes('columns'))).toBe(true)
    })

    it('should handle single column CSV', () => {
      const singleColumnCsv = `name
John
Jane`
      
      const result = validateAndNormalizeCsv(singleColumnCsv)
      
      expect(result.isValid).toBe(true)
      expect(result.normalizedContent).toBe(singleColumnCsv + '\n')
      expect(result.issues).toEqual(['Added missing trailing newline'])
    })

    it('should handle Windows line endings', () => {
      const csvWithCRLF = `name,age,city\r\nJohn,25,New York\r\nJane,30,Los Angeles\r\n`
      
      const result = validateAndNormalizeCsv(csvWithCRLF)
      
      expect(result.isValid).toBe(true)
      expect(result.normalizedContent).toBe(csvWithCRLF)
      expect(result.issues).toEqual([])
    })

    it('should handle complex quoted fields like company names', () => {
      const complexCsv = `id,name,company
1,John,"Acme, Inc."
2,Jane,"Smith & Associates, LLC"
3,Bob,"Wilson ""The Great"" & Co."`
      
      const result = validateAndNormalizeCsv(complexCsv)
      
      expect(result.isValid).toBe(true)
      expect(result.normalizedContent).toBe(complexCsv + '\n')
      expect(result.issues).toEqual(['Added missing trailing newline'])
    })
  })
})