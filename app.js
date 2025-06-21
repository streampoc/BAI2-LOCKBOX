// Lockbox/BAI2 Viewer Application

class FileParser {
    constructor() {
        // Definitions for a fixed-width Lockbox format
        // Tailwind CSS classes are used for colors instead of custom ones.
        this.recordTypes = {
            "1": { name: "Transmission Header", color: "bg-green-600 text-white", fields: { "Record Code": [1, 1], "Priority Code": [2, 3], "Destination": [4, 13], "Origin": [14, 23], "Date": [24, 29], "Time": [30, 33], "Reserved": [34, 300] }},
            "2": { name: "Service Header", color: "bg-blue-600 text-white", fields: { "Record Code": [1, 1], "Ultimate Network Address": [2, 11], "Ultimate Network Origin": [12, 21], "Reference Code": [22, 31], "Service Type": [32, 34], "Record Size": [35, 37], "Blocking Factor": [38, 41], "Format Code": [42, 42], "Reserved": [43, 300] }},
            "5": { name: "Lockbox Header", color: "bg-purple-600 text-white", fields: { "Record Code": [1, 1], "Reserved": [2, 7], "Lockbox Number": [8, 14], "Date": [15, 20], "Processing Destination": [21, 30], "Processing Origin": [31, 40], "Reserved2": [41, 300] }},
            "6": { name: "Payment", color: "bg-teal-600 text-white", fields: { "Record Code": [1, 1], "Batch Number": [2, 4], "Item Number": [5, 7], "Remittance Amount": [8, 17], "Remittance RTN": [18, 26], "Remittance Account Number": [27, 36], "Check Number": [37, 46], "Check Level User-Defined Field 1": [47, 76], "Filler": [77, 80], "Vicor TID": [81, 87], "Check Date": [88, 93], "Check Level Remitter Name": [94, 123], "Check Level Remitter Account Number": [124, 153], "Postmark Date": [154, 159], "Remitter Zip Code": [160, 168], "Envelope Sequence Number": [169, 171], "Check Level User-Defined Field 2": [172, 201], "Check Level User-Defined Field 3": [202, 231], "Check Level User-Defined Dollar Field 1": [232, 242], "Reserved": [243, 300] }},
            "4": { name: "Invoices", color: "bg-gray-500 text-white", fields: { "Record Code": [1, 1], "Batch Number": [2, 4], "Item Number": [5, 7], "Overflow Type": [8, 8], "Overflow Sequence Number": [9, 10], "Last Indicator": [11, 11], "Invoice Number": [12, 26], "Invoice Amount": [27, 36], "Invoice Level User-Defined Field 1": [37, 66], "Filler": [67, 80], "Invoice Date": [81, 86], "Gross Invoice Amount": [87, 97], "Discount Invoice Amount": [98, 108], "Invoice Remitter Account Number with Lockbox Customer": [109, 138], "Envelope Sequence Number": [139, 141], "Invoice Amount Due": [142, 152], "Invoice Level User-Defined Field 2": [153, 182], "Invoice Level User-Defined Field 3": [183, 212], "Invoice Level User-Defined Field 4": [213, 242], "Invoice Level User-Defined Dollar Field 1": [243, 253], "Invoice Level User-Defined Dollar Field 2": [254, 264], "Invoice Level User-Defined Dollar Field 3": [265, 275], "Invoice Level User-Defined Dollar Field 4": [276, 286], "Invoice Level User-Defined Date Field": [287, 292], "Reserved": [293, 300] }},
            "7": { name: "Batch Trailer", color: "bg-orange-500 text-white", fields: { "Record Code": [1, 1], "Batch Number": [2, 4], "Last Item Number": [5, 7], "Lockbox Number": [8, 14], "Processing Date": [15, 20], "Item Count": [21, 23], "Batch Total Amount": [24, 33], "Batch Summary Data": [34, 300] }},
            "8": { name: "Lockbox Trailer", color: "bg-blue-600 text-white", fields: { "Record Code": [1, 1], "Last Batch Number": [2, 4], "Last Item Number": [5, 7], "Lockbox Number": [8, 14], "Processing Date": [15, 20], "Item Count": [21, 23], "Lockbox Total Amount": [24, 33], "Filler": [34, 34], "Batch Count": [35, 37], "Reserved": [38, 80] }},
            "9": { name: "Transmission Trailer", color: "bg-green-600 text-white", fields: { "Record Code": [1, 1], "Record Count": [2, 7], "Reserved": [8, 80] }}
        };
    }

    parse(fileContent) {
        try {
            // This parser is for fixed-width files. We just need to split by line.
            const lines = fileContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
            const records = lines.filter(line => line.trim().length > 0);
            return this.processRecords(records);
        } catch (error) {
            throw new Error(`Failed to parse file: ${error.message}`);
        }
    }

    processRecords(records) {
        const processedRecords = [];
        const statistics = {
            totalRecords: records.length-1,
            recordCounts: {},
            fileInfo: {},
            accounts: [],
            transactions: []
        };

        for (let i = 0; i < records.length; i++) {
            const record = records[i];
            if (!record || record.length < 1) continue; // Minimum length for a 1-digit record code

            const recordCode = record.substring(0, 1); // Extract single-digit record code
            
            if (!this.recordTypes[recordCode]) {
                // Log unknown record types but continue parsing
                console.warn(`Unknown record type: ${recordCode}`);
                continue;
            }

            const parsedFieldsArray = this.parseFields(recordCode, record); // Pass the raw record string

            const processedRecord = {
                recordCode,
                recordType: this.recordTypes[recordCode],
                rawData: record, // Store the raw record string before field splitting
                fields: parsedFieldsArray, // Assign the returned parsed fields
                index: i
            };

            // Collect statistics
            statistics.recordCounts[recordCode] = (statistics.recordCounts[recordCode] || 0) + 1;

            // Extract specific information
            if (recordCode === '1') { // Immediate Address Header
                statistics.fileInfo = {
                    sender: processedRecord.fields.find(f => f.name === 'Origin')?.rawValue || '',
                    receiver: processedRecord.fields.find(f => f.name === 'Destination')?.rawValue || '',
                    creationDate: processedRecord.fields.find(f => f.name === 'Date')?.rawValue || '',
                    creationTime: processedRecord.fields.find(f => f.name === 'Time')?.rawValue || '',
                    fileId: '' // Not in this record
                };
            } else if (recordCode === '5') { // Lockbox Header is like an Account
                statistics.accounts.push({
                    accountNumber: processedRecord.fields.find(f => f.name === 'Lockbox Number')?.rawValue || '',
                    currencyCode: 'USD', // Assuming USD for lockbox, not explicitly in record 5
                    index: i
                });
            } else if (recordCode === '6') { // Detail is a Transaction
                statistics.transactions.push({
                    typeCode: 'DTL', // Hardcode as Detail
                    amount: processedRecord.fields.find(f => f.name === 'Remittance Amount')?.rawValue || '',
                    bankRef: processedRecord.fields.find(f => f.name === 'Remittance RTN')?.rawValue || '',
                    customerRef: processedRecord.fields.find(f => f.name === 'Check Number')?.rawValue || '',
                    description: processedRecord.fields.find(f => f.name === 'Remittance Account Number')?.rawValue || '',
                    index: i
                });
            }

            processedRecords.push(processedRecord);
        }

        return { records: processedRecords, statistics };
    }

    parseFields(recordCode, recordString) {
        const recordType = this.recordTypes[recordCode];
        if (!recordType || !recordType.fields) return [];

        const parsedFields = [];
        const fieldDefinitions = recordType.fields;

        for (const fieldName in fieldDefinitions) {
            const [start, end] = fieldDefinitions[fieldName];
            // Convert 1-based start position from the guide to 0-based index for substring.
            // A field at position X to Y in the guide is substring(X-1, Y).
            const rawValue = recordString.substring(start - 1, end).trim();
            let fieldValue = rawValue;

            // Apply special formatting
            if (fieldName.includes('Amount')) {
                fieldValue = this.formatAmount(fieldValue);
            } else if (fieldName.includes('Date')) {
                fieldValue = this.formatDate(fieldValue);
            } else if (fieldName.includes('Time')) {
                fieldValue = this.formatTime(fieldValue);
            }

            parsedFields.push({
                name: fieldName,
                value: fieldValue,
                rawValue: rawValue
            });
        }

        return parsedFields;
    }

    formatAmount(amount) {
        // Amounts are integers in cents
        const num = parseFloat(amount || '0') / 100;
        if (isNaN(num)) return amount;
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD' // Assuming USD for lockbox format
        }).format(num);
    }

    formatDate(date) {
        if (!date) return date;

        if (date.length === 6) { // YYMMDD format (e.g., for Record 8 Processing Date)
            const year = `20${date.substring(0, 2)}`; // Assuming 21st century
            const month = date.substring(2, 4);
            const day = date.substring(4, 6);
            return `${year}-${month}-${day}`; // YYYY-MM-DD format
        } else if (date.length === 8) { // MMDDYYYY format (e.g., for Record 1 Deposit Date)
            const month = date.substring(0, 2);
            const day = date.substring(2, 4);
            const year = date.substring(4, 8);
            return `${month}/${day}/${year}`; // MM/DD/YYYY format
        }
        return date; // Return as is if format not recognized
    }

    formatTime(time) {
        if (!time || time.length !== 4) return time;
        const hours = time.substring(0, 2);
        const minutes = time.substring(2, 4);
        return `${hours}:${minutes}`;
    }
}

class BAI2Viewer {
    constructor() {
        this.parser = new FileParser();
        this.currentData = null;
        this.currentFile = null;
        this.filteredRecords = [];
        this.visibleColumns = {
            '6': ['Batch Number', 'Item Number', 'Remittance Amount', 'Remittance RTN', 'Check Number', 'Check Date', 'Check Level Remitter Name'],
            '4': ['Invoice Number', 'Invoice Amount', 'Gross Invoice Amount', 'Discount Invoice Amount', 'Last Indicator']
        };
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        // File upload
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');

        // Handle click on the 'Select File' button specifically
        const selectFileButton = uploadArea.querySelector('button');
        selectFileButton.addEventListener('click', () => {
            // No preventDefault or stopPropagation here, let the button click naturally trigger the file input
            fileInput.click();
        });

        // Handle drag and drop events on the upload area
        // Keep these listeners for drag/drop functionality
        uploadArea.addEventListener('dragover', this.handleDragOver.bind(this));
        uploadArea.addEventListener('dragleave', this.handleDragLeave.bind(this));
        uploadArea.addEventListener('drop', this.handleFileDrop.bind(this));
        fileInput.addEventListener('change', this.handleFileSelect.bind(this));

        // Action buttons
        document.getElementById('exportBtn').addEventListener('click', this.exportData.bind(this));
        document.getElementById('printBtn').addEventListener('click', this.printView.bind(this));
        document.getElementById('newFileBtn').addEventListener('click', this.resetApplication.bind(this));
        document.getElementById('retryBtn').addEventListener('click', this.resetApplication.bind(this));
        document.getElementById('theme-toggle-btn').addEventListener('click', this.toggleTheme.bind(this));

        // Search and filter
        document.getElementById('searchInput').addEventListener('input', this.handleSearch.bind(this));
        document.getElementById('recordTypeFilter').addEventListener('change', this.handleFilter.bind(this));
        document.getElementById('clearFiltersBtn').addEventListener('click', this.clearFilters.bind(this));
        document.getElementById('statsGrid').addEventListener('click', this.handleStatClick.bind(this));
        document.getElementById('selectColumnsBtn').addEventListener('click', this.openColumnSelector.bind(this));
        document.getElementById('saveColumnSelection').addEventListener('click', this.saveColumnSelection.bind(this));
        document.getElementById('cancelColumnSelection').addEventListener('click', this.closeColumnSelector.bind(this));
    }

    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        document.getElementById('uploadArea').classList.add('border-blue-500', 'bg-blue-50', 'dark:bg-gray-700/50', 'scale-105');
    }

    handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        document.getElementById('uploadArea').classList.remove('border-blue-500', 'bg-blue-50', 'dark:bg-gray-700/50', 'scale-105');
    }

    handleFileDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        document.getElementById('uploadArea').classList.remove('border-blue-500', 'bg-blue-50', 'dark:bg-gray-700/50', 'scale-105');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }

    handleFileSelect(e) {
        const files = e.target.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }

    processFile(file) {
        this.currentFile = file;
        this.showLoading();

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target.result;
                const parsedData = this.parser.parse(content); // Use the unified parser
                this.currentData = parsedData;
                this.displayData();
            } catch (error) {
                this.showError(error.message);
            }
        };
        reader.onerror = () => {
            this.showError('Failed to read file. Please try again.');
        };
        reader.readAsText(file);
    }

    showLoading() {
        document.getElementById('uploadSection').classList.add('hidden');
        document.getElementById('mainContent').classList.add('hidden');
        document.getElementById('errorDisplay').classList.add('hidden');
        document.getElementById('loadingIndicator').classList.remove('hidden');
    }

    showError(message) {
        document.getElementById('uploadSection').classList.add('hidden');
        document.getElementById('mainContent').classList.add('hidden');
        document.getElementById('loadingIndicator').classList.add('hidden');
        document.getElementById('errorDisplay').classList.remove('hidden');
        document.getElementById('errorMessage').textContent = message;
    }

    displayData() {
        document.getElementById('uploadSection').classList.add('hidden');
        document.getElementById('loadingIndicator').classList.add('hidden');
        document.getElementById('errorDisplay').classList.add('hidden');
        document.getElementById('mainContent').classList.remove('hidden');

        this.displayFileInfo();
        this.displayStatistics();
        this.setupFilters();
        this.displayRecords();
    }

    displayFileInfo() {
        const fileDetails = document.getElementById('fileDetails');
        const stats = this.currentData.statistics;
        
        fileDetails.innerHTML = `
            <div>
                <div class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">File Name</div>
                <div class="text-sm text-gray-800 dark:text-gray-100">${this.currentFile.name}</div>
            </div>
            <div>
                <div class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">File Size</div>
                <div class="text-sm text-gray-800 dark:text-gray-100">${this.formatFileSize(this.currentFile.size)}</div>
            </div>
            <div>
                <div class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Upload Time</div>
                <div class="text-sm text-gray-800 dark:text-gray-100">${new Date().toLocaleString()}</div>
            </div>
            <div>
                <div class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Sender ID</div>
                <div class="text-sm text-gray-800 dark:text-gray-100 font-mono">${stats.fileInfo.sender || 'N/A'}</div>
            </div>
            <div>
                <div class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Receiver ID</div>
                <div class="text-sm text-gray-800 dark:text-gray-100 font-mono">${stats.fileInfo.receiver || 'N/A'}</div>
            </div>
            <div>
                <div class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Creation Date</div>
                <div class="text-sm text-gray-800 dark:text-gray-100">${stats.fileInfo.creationDate ? this.parser.formatDate(stats.fileInfo.creationDate) : 'N/A'}</div>
            </div>
            <div>
                <div class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Creation Time</div>
                <div class="text-sm text-gray-800 dark:text-gray-100">${stats.fileInfo.creationTime ? this.parser.formatTime(stats.fileInfo.creationTime) : 'N/A'}</div>
            </div>
        `;
    }

    displayStatistics() {
        const statsGrid = document.getElementById('statsGrid');
        const stats = this.currentData.statistics;
        
        const statsHtml = `
            <div class="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-md">
                <span class="block text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">${stats.totalRecords}</span>
                <div class="text-xs text-gray-500 dark:text-gray-400">Total Records</div>
            </div>
            <div class="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-md cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-transform" data-filter-code="5">
                <span class="block text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">${stats.accounts.length}</span>
                <div class="text-xs text-gray-500 dark:text-gray-400">Accounts</div>
            </div>
            <div class="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-md cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-transform" data-filter-code="6">
                <span class="block text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">${stats.transactions.length}</span>
                <div class="text-xs text-gray-500 dark:text-gray-400">Transactions</div>
            </div>
            <div class="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-md">
                <span class="block text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">${Object.keys(stats.recordCounts).length}</span>
                <div class="text-xs text-gray-500 dark:text-gray-400">Record Types</div>
            </div>
        `;
        
        statsGrid.innerHTML = statsHtml;
    }

    setupFilters() {
        const recordTypeFilter = document.getElementById('recordTypeFilter');
        const recordCounts = this.currentData.statistics.recordCounts;
        
        recordTypeFilter.innerHTML = '<option value="">All Record Types</option>';
        
        Object.keys(recordCounts).forEach(code => {
            const recordType = this.parser.recordTypes[code];
            if (recordType) {
                const option = document.createElement('option');
                option.value = code;
                option.textContent = `${code} - ${recordType.name} (${recordCounts[code]})`;
                recordTypeFilter.appendChild(option);
            }
        });
    }

    displayRecords() {
        this.filteredRecords = [...this.currentData.records];
        this.renderRecords();
    }

    renderRecords() { // This function orchestrates the rendering
        const parsedData = document.getElementById('parsedData');
        const recordTypeFilterValue = document.getElementById('recordTypeFilter').value;

        // Special handling for consolidated table views
        if (recordTypeFilterValue === '6') {
            parsedData.innerHTML = this.renderPaymentDetailsTable(this.filteredRecords);
        } else if (recordTypeFilterValue === '4') {
            parsedData.innerHTML = this.renderRemittanceDetailsTable(this.filteredRecords);
        } else {
            // Default behavior: group records and render them
            const groupedRecords = this.groupRecords(this.filteredRecords);
            parsedData.innerHTML = groupedRecords.map(group => this.renderGroupRecursive(group, 0)).join('');
        }
        
        // Add event listeners for expand/collapse for ALL views that might have a .record-header
        document.querySelectorAll('[data-group-id]').forEach(header => {
            header.addEventListener('click', this.toggleRecord.bind(this));
        });

        // Add copy functionality for all views
        document.querySelectorAll('[data-value]').forEach(field => {
            field.addEventListener('click', this.copyToClipboard.bind(this));
        });
    }

    // New recursive rendering function
    renderGroupRecursive(group, depth) {
        // Determine the header content
        let headerContent = '';
        let headerClass = '';
        let recordCountText = '';
        let headerId = '';
        let isCollapsible = true;

        if (group.header) { // If it's a group defined by a specific record (1, 2, 5, 7, 8, 9)
            headerContent = `<span>${group.type}</span>`;
            headerClass = group.color;
            headerId = group.header.index;
            if (group.records.length > 1 || group.children.length > 0) { // Count records directly in this group + header + children
                recordCountText = `(${group.records.length + group.children.reduce((acc, child) => acc + child.records.length, 0)} records in group)`;
            }
        } else { // Implicit group like "Batch"
            headerContent = `<span>${group.type} #${group.batchNumber || ''}</span>`;
            headerClass = "bg-orange-500 text-white"; // Batch color
            headerId = `implicit-group-${group.batchNumber || Math.random().toString(36).substring(7)}`; // Unique ID for implicit groups
            if (group.records.length > 0) {
                recordCountText = `(${group.records.length} records in batch)`;
            }
        }

        // If no direct records and no children, and it's not a header record, don't render this group
        if (!group.header && group.records.length === 0 && group.children.length === 0) return '';

        // If it's a leaf node with only one record (itself as header), don't make it collapsible
        if (group.records.length === 1 && group.children.length === 0 && group.header) {
            isCollapsible = false;
        }

        // For all group types, calculate the HTML for their direct records, excluding trailers for now
        const directRecordsHtml = group.records
            .filter(r => !group.children.some(child => child.header === r)) // Exclude records that are headers of child groups
            .filter(r => r.recordCode !== '8' && r.recordCode !== '7') // Exclude trailers
            .map(record => this.renderRecord(record))
            .join('');

        // Isolate the trailer record's HTML
        const trailerRecordHtml = group.records
            .filter(r => r.recordCode === '8' || r.recordCode === '7')
            .map(record => this.renderRecord(record))
            .join('');

        // Special rendering for Batch groups to ensure correct structure.
        // For a Batch, we render its children (Remittances).
        // For other groups, we render their direct records.
        const contentHtml = group.type === "Batch"
            ? `<div class="p-4 space-y-4">${group.children.map(remittanceGroup => this.renderRemittance(remittanceGroup)).join('')}</div>`
            : directRecordsHtml;

        // For non-batch groups, recursively render their children.
        const childrenHtml = group.type === "Batch"
            ? '' // Children were already rendered inside contentHtml for Batch
            : group.children.map(child => this.renderGroupRecursive(child, depth + 1)).join('');

        return `
            <div class="mb-4 rounded-lg overflow-hidden shadow-sm border border-gray-200 dark:border-gray-700">
                <div class="p-3 flex justify-between items-center ${isCollapsible ? 'cursor-pointer' : 'cursor-default'} ${headerClass}" data-group-id="${headerId}">
                    <div>
                        ${headerContent}
                        ${group.header ? `<span class="ml-2 text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full">${group.header.recordCode}</span>` : ''}
                        <span class="ml-2 text-xs opacity-80">${recordCountText}</span>
                    </div>
                    ${isCollapsible ? `<span class="transition-transform transform rotate-[-90deg]">▼</span>` : ''}
                </div>
                <div class="bg-white dark:bg-gray-800 border-t border-black/10" id="content-${headerId}" ${isCollapsible ? 'style="display: none;"' : ''}>
                    ${contentHtml}
                    ${childrenHtml}
                    ${trailerRecordHtml}
                </div>
            </div>
        `;
    }

    groupRecords(records) {
        const root = { type: "File Root", children: [] }; // Invisible root for the entire file structure
        const stack = [root]; // Stack of active parent groups

        records.forEach(record => {
        const recordCode = record.recordCode;
        let currentParent = stack[stack.length - 1];

        // Helper to create and push a new group onto the stack
        const pushNewGroup = (type, color, headerRecord) => {
            const newGroup = {
                type: type,
                color: color,
                header: headerRecord,
                records: headerRecord ? [headerRecord] : [], // Records directly belonging to this group (excluding children's records)
                children: []
            };
            currentParent.children.push(newGroup);
            stack.push(newGroup);
            return newGroup;
        };

        // Helper for orphaned records to create a new group without altering the stack
        const addOrphanGroup = (record) => {
            const newGroup = {
                type: record.recordType.name,
                color: record.recordType.color,
                header: record,
                records: [record],
                children: []
            };
            currentParent.children.push(newGroup);
        };

        if (recordCode === '1') {
            while (stack.length > 1) stack.pop();
            currentParent = stack[stack.length - 1];
            pushNewGroup(record.recordType.name, record.recordType.color, record);
        } else if (recordCode === '2') {
            while (stack.length > 2) stack.pop();
            currentParent = stack[stack.length - 1];
            pushNewGroup(record.recordType.name, record.recordType.color, record);
        } else if (recordCode === '5') {
            while (stack.length > 3) stack.pop();
            currentParent = stack[stack.length - 1];
            pushNewGroup(record.recordType.name, record.recordType.color, record);
        } else if (recordCode === '6') {
            const batchNumber = record.fields.find(f => f.name === 'Batch Number')?.rawValue;
            let currentBatchGroup = (stack[stack.length - 1].type === "Batch") ? stack[stack.length - 1] : null;
            if (!currentBatchGroup || currentBatchGroup.batchNumber !== batchNumber) {
                if (currentBatchGroup) stack.pop();
                currentParent = stack[stack.length - 1]; // Should be Lockbox Header
                currentBatchGroup = pushNewGroup("Batch", "transaction", null);
                currentBatchGroup.batchNumber = batchNumber;
            }
            // Create a new Remittance group for this Type 6 record
            const remittanceGroup = {
                type: "Detail",
                color: "detail-record",
                header: record, // The Type 6 record is the header
                records: [record], // It contains itself
                children: [] // No children for a remittance group
            };
            currentBatchGroup.children.push(remittanceGroup); // Add remittance to the batch's children
        } else if (recordCode === '4') {
            let currentBatchGroup = (stack[stack.length - 1].type === "Batch") ? stack[stack.length - 1] : null;
            if (currentBatchGroup && currentBatchGroup.children.length > 0) {
                // Add the Type 4 to the last Remittance group within the current Batch
                const lastRemittanceGroup = currentBatchGroup.children[currentBatchGroup.children.length - 1];
                lastRemittanceGroup.records.push(record);
            } else {
                addOrphanGroup(record);
            }
        } else if (recordCode === '7') {
            if (stack[stack.length - 1].type === "Batch") {
                stack[stack.length - 1].records.push(record); // Add the trailer to the batch
                stack.pop();
            } else {
                addOrphanGroup(record);
            }
        } else if (recordCode === '8') {
            if (stack[stack.length - 1].type === "Batch") stack.pop();
            currentParent = stack[stack.length - 1];
            if (currentParent.type === "Lockbox Header") {
                currentParent.records.push(record);
                stack.pop();
            } else {
                addOrphanGroup(record);
            }
        } else if (recordCode === '9') {
            while (stack.length > 1) stack.pop();
            currentParent = stack[stack.length - 1];
            pushNewGroup(record.recordType.name, record.recordType.color, record);
        } else {
            addOrphanGroup(record);
        }
    });

    return root.children;
    }

    renderRecord(record) {
        return `
            <div class="p-4">
                <h4 class="text-lg font-semibold mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">${record.recordType.name} (${record.recordCode})</h4>
                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
                    ${record.fields.map(field => `
                        <div>
                            <div class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">${field.name}</div>
                            <div class="text-xs font-mono bg-gray-100 dark:bg-gray-700 p-2 rounded break-all ${field.name.includes('Reference') || field.name.includes('ID') || field.name.includes('Number') ? 'cursor-pointer hover:opacity-80' : ''}" 
                                 data-value="${field.rawValue}">
                                ${field.value || 'N/A'}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderRemittance(remittanceGroup) {
        const detailRecord = remittanceGroup.header;
        const overflowRecords = remittanceGroup.records.filter(r => r.recordCode === '4');

        // The content of the Type 6 record, without the h4
        const detailRecordFieldsHtml = `
            <div class="p-4">
                <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    ${detailRecord.fields.filter(field => field.name !== 'Record Code').map(field => `
                        <div>
                            <div class="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">${field.name}</div>
                            <div class="text-xs font-mono bg-gray-100 dark:bg-gray-700 p-2 rounded break-all ${field.name.includes('Reference') || field.name.includes('ID') || field.name.includes('Number') ? 'cursor-pointer hover:opacity-80' : ''}" 
                                 data-value="${field.rawValue}">
                                ${field.value || 'N/A'}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        return `
            <div class="mb-4 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <div class="p-3 flex justify-between items-center cursor-pointer ${detailRecord.recordType.color}" data-group-id="detail-${detailRecord.index}">
                    <div>
                        <span class="font-semibold">${detailRecord.recordType.name}</span>
                        <span class="ml-2 text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full">${detailRecord.recordCode}</span>
                    </div>
                    <span class="transition-transform transform rotate-[-90deg]">▼</span>
                </div>
                <div class="bg-white dark:bg-gray-800 border-t border-black/10" id="content-detail-${detailRecord.index}" style="display: none;">
                    ${detailRecordFieldsHtml}
                    ${this.renderRemittanceDetailsTable(overflowRecords)}
                </div>
            </div>
        `;
    }

    renderPaymentDetailsTable(payments) {
        // This table is rendered within the Account record group, summarizing its transactions
        if (payments.length === 0) return '';
        const headers = this.visibleColumns['6'];
        if (!headers || headers.length === 0) {
            return '<div class="p-4 text-center text-gray-500 dark:text-gray-400">No columns selected for Remittance Records. Use the "Columns" button to select columns to display.</div>';
        }

        return `
            <div class="p-4">
                <h4 class="text-base font-semibold mb-3">Remittance Records (Type 6)</h4>
                <div class="overflow-x-auto">
                <table class="w-full text-left text-xs">
                    <thead>
                        <tr class="bg-gray-50 dark:bg-gray-700/50">
                            ${headers.map(fieldName => `<th class="px-4 py-2">${fieldName}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${payments.map(p => {
                            const rowCells = headers.map(fieldName => {
                                const field = p.fields.find(f => f.name === fieldName);
                                const rawValue = field?.rawValue || '';
                                const displayValue = field?.value || 'N/A';
                                let classes = '';

                                // Apply specific classes based on field name
                                if (fieldName.includes('Amount') || fieldName.includes('Dollar Field')) {
                                    classes += ' text-right';
                                    const numValue = parseFloat(rawValue || '0');
                                    if (numValue > 0) classes += ' text-green-600 dark:text-green-400';
                                    else if (numValue < 0) classes += ' text-red-600 dark:text-red-400';
                                }
                                if (fieldName.includes('Number') || fieldName.includes('ID') || fieldName.includes('Code') ||
                                    fieldName.includes('Sequence') || fieldName.includes('Indicator') || fieldName.includes('RTN') ||
                                    fieldName.includes('Batch') || fieldName.includes('Item') || fieldName.includes('Type') ||
                                    fieldName.includes('TID') || fieldName.includes('Zip')) {
                                    classes += ' cursor-pointer font-mono';
                                }

                                return `<td class="px-4 py-2 border-t border-gray-200 dark:border-gray-700 ${classes.trim()}" data-value="${rawValue}">${displayValue}</td>`;
                            }).join('');

                            return `
                                <tr data-record-index="${p.index}">${rowCells}
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
                </div>
            </div>
        `;
    }

    renderRemittanceDetailsTable(remittances) {
        if (remittances.length === 0) return '';
        const headers = this.visibleColumns['4'];
        if (!headers || headers.length === 0) {
            return '<div class="p-4 text-center text-gray-500 dark:text-gray-400">No columns selected for Invoice Records. Use the "Columns" button to select columns to display.</div>';
        }

        const uniqueId = `overflow-table-${remittances[0].index}`; // Unique ID for this collapsible section

        return `
            <div class="border-t border-gray-200 dark:border-gray-700">
                <div class="p-3 flex justify-between items-center cursor-pointer bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600" data-group-id="${uniqueId}">
                    <div>
                        <span class="font-semibold">Invoice Records (Type 4)</span>
                        <span class="ml-2 text-xs opacity-80">(${remittances.length} records)</span>
                    </div>
                    <span class="transition-transform transform rotate-[-90deg]">▼</span>
                </div>
                <div class="bg-white dark:bg-gray-800" id="content-${uniqueId}" style="display: none;">
                    <div class="p-4">
                        <div class="overflow-x-auto">
                        <table class="w-full text-left text-xs">
                            <thead>
                                <tr class="bg-gray-50 dark:bg-gray-700/50">
                                    ${headers.map(fieldName => `<th class="px-4 py-2">${fieldName}</th>`).join('')}
                                </tr>
                            </thead>
                            <tbody>
                                ${remittances.map(r => {
                                    const rowCells = headers.map(fieldName => {
                                        const field = r.fields.find(f => f.name === fieldName); // Find the parsed field by name
                                        const rawValue = field?.rawValue || '';
                                        const displayValue = field?.value || 'N/A';
                                        let classes = '';

                                        // Apply specific classes based on field name
                                        if (fieldName.includes('Amount') || fieldName.includes('Dollar Field')) {
                                            classes += ' text-right';
                                            const numValue = parseFloat(rawValue || '0');
                                            if (numValue > 0) classes += ' text-green-600 dark:text-green-400';
                                            else if (numValue < 0) classes += ' text-red-600 dark:text-red-400';
                                        }
                                        // Fields that are typically identifiers or codes should be copyable and monospace
                                        if (fieldName.includes('Number') || fieldName.includes('ID') || fieldName.includes('Code') ||
                                            fieldName.includes('Sequence') || fieldName.includes('Indicator') || fieldName.includes('RTN') ||
                                            fieldName.includes('Batch') || fieldName.includes('Item') || fieldName.includes('Type')) {
                                            classes += ' cursor-pointer font-mono';
                                        }

                                        return `<td class="px-4 py-2 border-t border-gray-200 dark:border-gray-700 ${classes.trim()}" data-value="${rawValue}">${displayValue}</td>`;
                                    }).join('');

                                    return `
                                        <tr data-record-index="${r.index}">${rowCells}
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    toggleRecord(e) {
        const header = e.currentTarget;
        const groupId = header.dataset.groupId;
        const content = document.getElementById(`content-${groupId}`);
        
        // Ensure content is not null before trying to access style
        if (!content) {
            console.warn(`Content element not found for group ID: ${groupId}`);
            return;
        }
        if (content.style.display === 'none') {
            content.style.display = 'block';
            header.querySelector('span.transition-transform')?.classList.remove('rotate-[-90deg]');
        } else {
            content.style.display = 'none';
            header.querySelector('span.transition-transform')?.classList.add('rotate-[-90deg]');
        }
    }

    handleStatClick(e) {
        const statItem = e.target.closest('[data-filter-code]');
        if (!statItem) return;

        const filterCode = statItem.dataset.filterCode;
        if (filterCode) {
            // Update the filter dropdown
            const recordTypeFilter = document.getElementById('recordTypeFilter');
            recordTypeFilter.value = filterCode;

            // Clear the search input to avoid confusion
            document.getElementById('searchInput').value = '';

            // Apply the filter and re-render
            this.filterRecords('', filterCode);

            // Scroll to the results for better user experience
            document.getElementById('parsedData').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    handleSearch(e) {
        const searchTerm = e.target.value.toLowerCase();
        this.filterRecords(searchTerm, document.getElementById('recordTypeFilter').value);
    }

    handleFilter(e) {
        const recordType = e.target.value;
        this.filterRecords(document.getElementById('searchInput').value.toLowerCase(), recordType);
    }

    filterRecords(searchTerm, recordType) {
        this.filteredRecords = this.currentData.records.filter(record => {
            const matchesSearch = !searchTerm || 
                record.rawData.toLowerCase().includes(searchTerm) ||
                (record.recordType && record.recordType.name.toLowerCase().includes(searchTerm)) || // Check if recordType exists
                record.fields.some(field => 
                    field.value.toLowerCase().includes(searchTerm) ||
                    field.name.toLowerCase().includes(searchTerm)
                );
            
            const matchesType = !recordType || record.recordCode === recordType;
            
            return matchesSearch && matchesType;
        });
        
        this.renderRecords();
    }

    clearFilters() {
        document.getElementById('searchInput').value = '';
        document.getElementById('recordTypeFilter').value = '';
        this.filteredRecords = [...this.currentData.records];
        this.renderRecords();
    }

    copyToClipboard(e) {
        const value = e.currentTarget.dataset.value || e.currentTarget.textContent;
        if (value && value !== 'N/A') {
            navigator.clipboard.writeText(value).then(() => {
                // Show brief feedback
                const originalText = e.currentTarget.textContent;
                const originalClasses = e.currentTarget.className;
                e.currentTarget.className = `${originalClasses} bg-green-500 text-white`;
                e.currentTarget.textContent = 'Copied!';
                setTimeout(() => {
                    e.currentTarget.textContent = originalText;
                    e.currentTarget.className = originalClasses;
                }, 1000);
            }).catch(() => {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = value;
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
                
                // Show feedback
                const originalText = e.currentTarget.textContent;
                e.currentTarget.textContent = 'Copied!';
                setTimeout(() => {
                    e.currentTarget.textContent = originalText;
                }, 1000);
            });
        }
    }

    exportData() {
        if (!this.currentData) return;
        
        const dataStr = JSON.stringify(this.currentData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `${this.currentFile.name.replace(/\.[^/.]+$/, '')}_parsed.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
    }

    printView() {
        // Expand all sections before printing
        const allContents = document.querySelectorAll('.record-content');
        const allHeaders = document.querySelectorAll('[data-group-id]');
        
        allContents.forEach(content => {
            content.style.display = '';
        });
        
        allHeaders.forEach(header => {
            header.querySelector('span.transition-transform')?.classList.remove('rotate-[-90deg]');
        });
        
        // Print after a short delay to ensure content is expanded
        setTimeout(() => {
            window.print();
        }, 100);
    }

    resetApplication() {
        this.currentData = null;
        this.currentFile = null;
        this.filteredRecords = [];
        
        document.getElementById('uploadSection').classList.remove('hidden');
        document.getElementById('mainContent').classList.add('hidden');
        document.getElementById('errorDisplay').classList.add('hidden');
        document.getElementById('loadingIndicator').classList.add('hidden');
        document.getElementById('fileInput').value = '';
        
        // Clear search and filter inputs
        document.getElementById('searchInput').value = '';
        document.getElementById('recordTypeFilter').value = '';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    toggleTheme() {
        const htmlEl = document.documentElement;
        if (htmlEl.classList.contains('dark')) {
            htmlEl.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        } else {
            htmlEl.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        }
    }

    // New methods for column selection
    openColumnSelector() {
        const modal = document.getElementById('columnSelectorModal');
        
        const populateCheckboxes = (recordType, containerId) => {
            const container = document.getElementById(containerId);
            const allFields = Object.keys(this.parser.recordTypes[recordType].fields);
            const visibleFields = this.visibleColumns[recordType];
            
            container.innerHTML = allFields
                .filter(fieldName => fieldName !== 'Record Code')
                .map(fieldName => {
                    const isChecked = visibleFields.includes(fieldName);
                    return `
                        <label class="flex items-center space-x-2 cursor-pointer select-none">
                            <input type="checkbox" value="${fieldName}" data-record-type="${recordType}" ${isChecked ? 'checked' : ''} class="rounded border-gray-300 text-blue-600 shadow-sm focus:ring-blue-500 dark:bg-gray-900 dark:border-gray-600">
                            <span class="text-sm">${fieldName}</span>
                        </label>
                    `;
                }).join('');
        };
        
        populateCheckboxes('6', 'type6Columns');
        populateCheckboxes('4', 'type4Columns');
        
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }

    closeColumnSelector() {
        const modal = document.getElementById('columnSelectorModal');
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }

    saveColumnSelection() {
        const newVisibleColumns = { '6': [], '4': [] };
        
        document.querySelectorAll('#columnSelectorModal input[type="checkbox"]:checked').forEach(checkbox => {
            const recordType = checkbox.dataset.recordType;
            if (newVisibleColumns[recordType]) {
                newVisibleColumns[recordType].push(checkbox.value);
            }
        });
        
        this.visibleColumns = newVisibleColumns;
        this.closeColumnSelector();
        this.renderRecords(); // Re-render with new column selection
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    const viewer = new BAI2Viewer();
    // Check for saved theme preference
    if (localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
});
