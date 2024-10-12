document.getElementById('compareButton').addEventListener('click', compareFiles);

function compareFiles() {
    const customerBOMFile = document.getElementById('customerBOM').files[0];
    const cqReadyBOMFile = document.getElementById('cqReadyBOM').files[0];

    if (customerBOMFile && cqReadyBOMFile) {
        console.log("Both files are selected. Proceeding to load files...");

        let reader1 = new FileReader();
        let reader2 = new FileReader();

        reader1.onload = function (e) {
            let data1 = e.target.result;
            let workbook1 = XLSX.read(data1, { type: 'binary' }); // Specify the type as 'binary'
            let customerBOMData = XLSX.utils.sheet_to_json(workbook1.Sheets[workbook1.SheetNames[0]]);
            console.log("Customer BOM Data Parsed:", customerBOMData); // Log full Customer BOM data

            reader2.onload = function (e) {
                let data2 = e.target.result;
                let workbook2 = XLSX.read(data2, { type: 'binary' }); // Specify the type as 'binary'
                let cqReadyBOMData = XLSX.utils.sheet_to_json(workbook2.Sheets[workbook2.SheetNames[0]]);
                console.log("CQ Ready BOM Data Parsed:", cqReadyBOMData);  // Log full CQ Ready BOM data

                // Compare the two BOMs
                compareBOMs(customerBOMData, cqReadyBOMData);
            };
            reader2.readAsBinaryString(cqReadyBOMFile); // Load CQ Ready BOM file as binary string
        };
        reader1.readAsBinaryString(customerBOMFile); // Load Customer BOM file as binary string
    } else {
        console.error("One or both files are missing");
    }
}

function compareBOMs(customerBOM, cqReadyBOM) {
    let customerDesignators = new Map();  // Use a Map to store designators, MPNs, and Line Item numbers
    let cqReadyDesignators = new Map();

    // Collect and normalize designators, MPNs, and Line Items from Customer BOM
    customerBOM.forEach((row, index) => {
        if (row['Designator'] && row['MPN']) {
            row['Designator'].split(',').forEach(des => {
                let normalizedDes = des.trim().toUpperCase();
                let normalizedMPN = row['MPN'].trim().toUpperCase(); // Normalize MPN
                customerDesignators.set(normalizedDes, { MPN: normalizedMPN, lineItem: row['Line Item'] || index + 1 });
            });
        }
    });

    // Collect and normalize designators, MPNs, and Line Items from CQ Ready BOM
    cqReadyBOM.forEach((row, index) => {
        if (row['Designator'] && row['MPN']) {
            row['Designator'].split(',').forEach(des => {
                let normalizedDes = des.trim().toUpperCase();
                let normalizedMPN = row['MPN'].trim().toUpperCase(); // Normalize MPN
                cqReadyDesignators.set(normalizedDes, { MPN: normalizedMPN, lineItem: row['Line Item'] || index + 1 });
            });
        }
    });

    let missingFromCQ = [];
    let missingFromCustomer = [];
    let mpnMismatch = [];

    // Compare designators and MPNs between the two BOMs
    customerDesignators.forEach((customerData, designator) => {
        let cqData = cqReadyDesignators.get(designator);
        if (!cqData) {
            // Designator is missing in CQ Ready BOM
            missingFromCQ.push({
                designator,
                lineItem: customerData.lineItem
            });
        } else if (customerData.MPN !== cqData.MPN) {
            // MPN mismatch
            mpnMismatch.push({
                designator,
                customerMPN: customerData.MPN,
                cqMPN: cqData.MPN,
                lineItem: customerData.lineItem
            });
        }
    });

    // Find designators in CQ Ready BOM that are missing in Customer BOM
    cqReadyDesignators.forEach((cqData, designator) => {
        if (!customerDesignators.has(designator)) {
            missingFromCustomer.push({
                designator,
                lineItem: cqData.lineItem
            });
        }
    });

    // Log designator and MPN differences
    console.log("Missing Designators from CQ Ready BOM:", missingFromCQ);
    console.log("Missing Designators from Customer BOM:", missingFromCustomer);
    console.log("MPN Mismatches:", mpnMismatch);

    // Display the results
    if (missingFromCQ.length === 0 && missingFromCustomer.length === 0 && mpnMismatch.length === 0) {
        console.log("No designator or MPN differences found.");
        displayReport('No differences found.');
    } else {
        let report = `<h2>Differences Report</h2>`;
        
        if (missingFromCQ.length > 0) {
            report += `<p><strong>Missing Designators from CQ Ready BOM:</strong></p><ul>`;
            missingFromCQ.forEach(missing => {
                report += `<li>Line Item: ${missing.lineItem}, Designator: ${missing.designator.toLowerCase()}</li>`;
            });
            report += `</ul>`;
        }

        if (missingFromCustomer.length > 0) {
            report += `<p><strong>Missing Designators from Customer BOM:</strong></p><ul>`;
            missingFromCustomer.forEach(missing => {
                report += `<li>Line Item: ${missing.lineItem}, Designator: ${missing.designator.toLowerCase()}</li>`;
            });
            report += `</ul>`;
        }

        if (mpnMismatch.length > 0) {
            report += `<p><strong>MPN Mismatches:</strong></p><ul>`;
            mpnMismatch.forEach(mismatch => {
                report += `<li>Line Item: ${mismatch.lineItem}, Designator: ${mismatch.designator.toLowerCase()}, 
                Customer MPN: ${mismatch.customerMPN}, CQ Ready MPN: ${mismatch.cqMPN}</li>`;
            });
            report += `</ul>`;
        }

        displayReport(report);
    }
}

function displayReport(report) {
    const output = document.getElementById('output');
    output.innerHTML = report;
}
