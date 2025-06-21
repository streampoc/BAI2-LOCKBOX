# Lockbox BAI2 Viewer

**Live Demo:** [**https://streampoc.github.io/BAI2-LOCKBOX/**](https://streampoc.github.io/BAI2-LOCKBOX/)

---

A simple, single-page static web application designed to parse, display, and analyze fixed-width lockbox (BAI2) format files. This tool provides a user-friendly interface to inspect the structured data within your BAI2 files, offering detailed record breakdowns, summary statistics, and filtering capabilities.

## Features

*   **File Upload:** Supports drag-and-drop or traditional file selection for `.txt`, `.dat`, and `.csv` files.
*   **Fixed-Width Parsing:** Specifically designed to parse common fixed-width BAI2 record types (1, 2, 4, 5, 6, 7, 8, 9).
*   **Detailed Record View:** Presents parsed data in an organized, hierarchical view, grouping related records (e.g., Transmission, Service, Lockbox, Batch, Payment, Invoices).
*   **Summary Statistics:** Provides an overview of the file, including total records, number of accounts, transactions, and unique record types.
*   **File Information:** Displays key metadata extracted from the file, such as sender/receiver IDs, creation date/time, and file size.
*   **Search & Filter:** Easily search for specific content within records or filter by record type for focused analysis.
*   **Copy to Clipboard:** Click on any raw field value to quickly copy it to your clipboard.
*   **Data Export:** Export the entire parsed data as a JSON file for further programmatic use.
*   **Print View:** Generate a print-friendly version of the displayed data.
*   **Theme Toggle:** Switch between light and dark modes for comfortable viewing.
*   **Customizable Columns:** Select which fields to display for Payment (Type 6) and Invoice (Type 4) records in their respective table views.

## Technologies Used

*   **Frontend:** HTML, JavaScript
*   **Styling:** Tailwind CSS (via CDN)
*   **Version Control:** Git
*   **Build & Deployment:** Node.js, npm, `terser`, `html-minifier-terser`, `gh-pages`

## Getting Started

### Prerequisites

*   A modern web browser (for viewing the application).
*   Node.js and npm (if you plan to build/minify the application yourself).

### Usage (as a deployed application)
1.  Visit the Live Demo URL.
2.  Drag and drop your fixed-width BAI2 file (e.g., `.txt`, `.dat`, `.csv`) onto the upload area.
    *   Alternatively, click the **Select File** button to browse for your file.
3.  The application will parse and display the file's contents.
4.  Use the search bar, record type filter, and column selector to explore the data.
5.  Utilize the "Export JSON", "Print View", and "Upload New File" buttons as needed.

### Local Development & Build

1.  **Clone the repository:**
    ```sh
    git clone <repository-url> # Replace with your actual repository URL
    cd bai2-LOCKBOX
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Run the build process:**
    This command minifies the source files and prepares them for deployment in the `dist/` folder.
    ```sh
    npm run build
    ```
4.  **Deploy to GitHub Pages:**
    This command will automatically build the project and push the contents of the `dist/` folder to the `gh-pages` branch.
    ```sh
    npm run deploy
    ```

## Project Structure

```
bai2-LOCKBOX/
├── .gitignore          # Specifies intentionally untracked files to ignore
├── robots.txt          # Instructions for web crawlers
├── sitemap.xml         # XML sitemap for search engines
├── googleb84f590d35ba85ce.html # HTML file for search engine ownership verification (replace with actual name)
└── README.md
└── dist/               # Output directory for minified and deployable files
    ├── app.min.js
    ├── index.html
    └── README.md
```

## License

This project is licensed under the ISC License. See the `LICENSE` file (if present) for details.