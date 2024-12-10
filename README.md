# SKU Code Verification Tool

A web-based application designed to assist accountants in verifying and managing SKU codes across multiple Excel files. This tool simplifies the process of comparing SKU data with monthly reports and generates a detailed summary of matches, mismatches, and potential errors.

## Features

- **File Upload**: Upload two Excel files:
  1. **SKU Data File**: Contains reference SKU codes and associated details.
  2. **Monthly Report File**: Contains item descriptions and other data, updated monthly.
  
- **Data Filtering**: Automatically filters the necessary columns and data for processing.
  
- **SKU Comparison**: Compares item descriptions in the monthly report to the reference SKU codes:
  - Identifies exact matches.
  - Detects mismatches or missing SKUs.
  - Suggests possible corrections for typos or near matches.

- **Special Case Handling**: Handles exceptions or special cases as defined by the accountant's requirements.

- **Excel Report Generation**: Creates a new Excel file summarizing the results:
  - Items with matching SKUs.
  - Items with mismatches or missing SKUs.
  - Suggested corrections for potential typos.

## Test

1. Download the example Excel data provided in the `example data` folder of this repository.
2. Test the app by accessing it through this link: https://joro0.github.io/SKU-Verifier/
