# CSV Splitter

A React-based web application that allows users to upload CSV files and split them into smaller chunks, all processed client-side.

## Features

- **File Upload**: Upload CSV files directly in the browser
- **Configurable Splitting**: Set maximum lines per output file
- **Header Handling**: Option to include/exclude headers in split files
- **Preview**: View first few lines of uploaded CSV before splitting
- **Batch Download**: Download all split files at once or individually
- **Client-Side Processing**: All processing happens in the browser - no server required
- **Validation**: Basic CSV format validation

## Example Use Case

If you have a CSV with 30,000 lines and want to split it into files with maximum 10,000 lines each:
1. Upload your CSV file
2. Set "Max lines per file" to 10,000
3. Click "Split CSV"
4. Download 3 separate CSV files (each with 10,000 lines or fewer)

## Development

### Installation

```bash
pnpm install
```

### Running the Application

```bash
pnpm dev
```

The application will be available at `http://localhost:5173`

### Testing

Run the comprehensive test suite:

```bash
# Run tests once
pnpm test:run

# Run tests in watch mode
pnpm test

# Run tests with UI
pnpm test:ui
```

### Building for Production

```bash
pnpm build
```

## Testing

The application includes comprehensive tests for:

- **CSV Splitting Logic**: Various scenarios including edge cases
- **File Handling**: Blob creation and download functionality
- **React Components**: User interface interactions
- **Validation**: CSV format validation

Test coverage includes:
- 20 unit tests for CSV utility functions
- 7 component tests for the React interface
- Mock implementations for browser APIs (File API, URL API)

## Technology Stack

- **React 19** with TypeScript
- **Vite** for build tooling
- **Vitest** for testing
- **CSS3** for styling
- Client-side file processing using Web APIs

## Sample Data

A sample CSV file (`sample-data.csv`) with 30 employee records is included for testing the splitting functionality.

## Architecture

- `src/utils/csvUtils.ts` - Core CSV processing logic
- `src/App.tsx` - Main React component with file upload and UI
- `src/utils/csvUtils.test.ts` - Comprehensive test suite
- `src/App.test.tsx` - Component tests