/**
 * Report Service for NIC Validation System
 * Handles generation of reports in PDF, CSV, and Excel formats
 */

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { body, param, validationResult } = require('express-validator');
const winston = require('winston');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs-extra');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const axios = require('axios');

// Import database and models
const { sequelize } = require('../../shared/config/database');
const Report = require('../../shared/models/Report')(sequelize);
const NICRecord = require('../../shared/models/NICRecord')(sequelize);
const UploadedFile = require('../../shared/models/UploadedFile')(sequelize);

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const PORT = process.env.PORT || 8085;

// Configure logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'report-service' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

// Create reports directory if it doesn't exist
const reportsDir = path.join(__dirname, '../reports');
fs.ensureDirSync(reportsDir);

// Initialize database and sync models
async function initializeDatabase() {
  try {
    // Define associations
    UploadedFile.hasMany(NICRecord, { foreignKey: 'fileId', onDelete: 'CASCADE' });
    NICRecord.belongsTo(UploadedFile, { foreignKey: 'fileId' });
    
    await sequelize.sync();
    logger.info('Database synchronized successfully');
  } catch (error) {
    logger.error(`Database synchronization failed: ${error.message}`);
    process.exit(1);
  }
}

// Validation middleware
const validateGenerateReport = [
  body('type').isIn(['PDF', 'CSV', 'EXCEL']).withMessage('Report type must be PDF, CSV, or EXCEL'),
  body('fileId').optional().isInt().withMessage('File ID must be an integer')
];

const validateReportId = [
  param('id').isInt().withMessage('Report ID must be an integer')
];

// Helper functions for report generation

// Generate PDF report
async function generatePDFReport(data, title) {
  return new Promise((resolve, reject) => {
    try {
      const fileName = `report-${Date.now()}.pdf`;
      const filePath = path.join(reportsDir, fileName);
      
      // Create PDF document
      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(filePath);
      
      // Handle stream events
      stream.on('error', reject);
      stream.on('finish', () => resolve({ fileName, filePath }));
      
      // Pipe PDF to file
      doc.pipe(stream);
      
      // Add title
      doc.fontSize(20).text(title, { align: 'center' });
      doc.moveDown();
      
      // Add generation date
      doc.fontSize(12).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'right' });
      doc.moveDown(2);
      
      // Add summary
      doc.fontSize(16).text('Summary', { underline: true });
      doc.moveDown();
      doc.fontSize(12).text(`Total Records: ${data.length}`);
      
      const validRecords = data.filter(record => record.isValid).length;
      const invalidRecords = data.length - validRecords;
      
      doc.text(`Valid Records: ${validRecords} (${((validRecords / data.length) * 100).toFixed(2)}%)`);
      doc.text(`Invalid Records: ${invalidRecords} (${((invalidRecords / data.length) * 100).toFixed(2)}%)`);
      doc.moveDown(2);
      
      // Add table header
      doc.fontSize(16).text('NIC Records', { underline: true });
      doc.moveDown();
      
      // Define table columns
      const tableTop = doc.y;
      const tableColumnWidth = 80;
      
      // Draw table header
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('NIC Number', 50, tableTop);
      doc.text('Valid', 180, tableTop);
      doc.text('Gender', 230, tableTop);
      doc.text('Age', 310, tableTop);
      doc.text('Birthday', 360, tableTop);
      doc.text('Error', 450, tableTop);
      
      // Draw horizontal line
      doc.moveTo(50, tableTop + 15)
         .lineTo(550, tableTop + 15)
         .stroke();
      
      // Draw table rows
      let rowTop = tableTop + 25;
      
      // Process records in batches to avoid memory issues
      const batchSize = 30; // Adjust based on PDF page capacity
      
      for (let i = 0; i < data.length; i++) {
        const record = data[i];
        
        // Check if we need a new page
        if (rowTop > 700) {
          doc.addPage();
          rowTop = 50;
          
          // Redraw header on new page
          doc.fontSize(10).font('Helvetica-Bold');
          doc.text('NIC Number', 50, rowTop);
          doc.text('Valid', 180, rowTop);
          doc.text('Gender', 230, rowTop);
          doc.text('Age', 310, rowTop);
          doc.text('Birthday', 360, rowTop);
          doc.text('Error', 450, rowTop);
          
          // Draw horizontal line
          doc.moveTo(50, rowTop + 15)
             .lineTo(550, rowTop + 15)
             .stroke();
          
          rowTop += 25;
        }
        
        // Draw row
        doc.fontSize(9).font('Helvetica');
        doc.text(record.nicNumber, 50, rowTop);
        doc.text(record.isValid ? 'Yes' : 'No', 180, rowTop);
        doc.text(record.gender || '-', 230, rowTop);
        doc.text(record.age ? record.age.toString() : '-', 310, rowTop);
        doc.text(record.birthday || '-', 360, rowTop);
        doc.text(record.validationError || '-', 450, rowTop, { width: 100 });
        
        // Calculate row height based on error message length
        const rowHeight = Math.max(15, doc.heightOfString(record.validationError || '-', { width: 100 }));
        rowTop += rowHeight + 5;
      }
      
      // Finalize PDF
      doc.end();
      
    } catch (error) {
      reject(error);
    }
  });
}

// Generate CSV report
async function generateCSVReport(data, title) {
  try {
    const fileName = `report-${Date.now()}.csv`;
    const filePath = path.join(reportsDir, fileName);
    
    // Create CSV header
    let csvContent = 'NIC Number,Valid,Gender,Age,Birthday,Error\n';
    
    // Add rows
    data.forEach(record => {
      const row = [
        record.nicNumber,
        record.isValid ? 'Yes' : 'No',
        record.gender || '',
        record.age || '',
        record.birthday || '',
        record.validationError || ''
      ];
      
      // Escape fields and join with commas
      csvContent += row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',') + '\n';
    });
    
    // Write to file
    await fs.writeFile(filePath, csvContent, 'utf8');
    
    return { fileName, filePath };
  } catch (error) {
    throw error;
  }
}

// Generate Excel report
async function generateExcelReport(data, title) {
  try {
    const fileName = `report-${Date.now()}.xlsx`;
    const filePath = path.join(reportsDir, fileName);
    
    // Create workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('NIC Validation Report');
    
    // Add title
    worksheet.mergeCells('A1:F1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = title;
    titleCell.font = { size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center' };
    
    // Add generation date
    worksheet.mergeCells('A2:F2');
    const dateCell = worksheet.getCell('A2');
    dateCell.value = `Generated on: ${new Date().toLocaleString()}`;
    dateCell.alignment = { horizontal: 'right' };
    
    // Add summary
    worksheet.mergeCells('A4:B4');
    worksheet.getCell('A4').value = 'Summary';
    worksheet.getCell('A4').font = { size: 14, bold: true, underline: true };
    
    worksheet.getCell('A5').value = 'Total Records:';
    worksheet.getCell('B5').value = data.length;
    
    const validRecords = data.filter(record => record.isValid).length;
    const invalidRecords = data.length - validRecords;
    
    worksheet.getCell('A6').value = 'Valid Records:';
    worksheet.getCell('B6').value = `${validRecords} (${((validRecords / data.length) * 100).toFixed(2)}%)`;
    
    worksheet.getCell('A7').value = 'Invalid Records:';
    worksheet.getCell('B7').value = `${invalidRecords} (${((invalidRecords / data.length) * 100).toFixed(2)}%)`;
    
    // Add table header
    worksheet.mergeCells('A9:F9');
    worksheet.getCell('A9').value = 'NIC Records';
    worksheet.getCell('A9').font = { size: 14, bold: true, underline: true };
    
    // Define columns
    worksheet.columns = [
      { header: 'NIC Number', key: 'nicNumber', width: 20 },
      { header: 'Valid', key: 'valid', width: 10 },
      { header: 'Gender', key: 'gender', width: 10 },
      { header: 'Age', key: 'age', width: 10 },
      { header: 'Birthday', key: 'birthday', width: 15 },
      { header: 'Error', key: 'error', width: 40 }
    ];
    
    // Style header row
    worksheet.getRow(10).font = { bold: true };
    worksheet.getRow(10).alignment = { horizontal: 'center' };
    
    // Add data rows
    data.forEach(record => {
      worksheet.addRow({
        nicNumber: record.nicNumber,
        valid: record.isValid ? 'Yes' : 'No',
        gender: record.gender || '-',
        age: record.age || '-',
        birthday: record.birthday || '-',
        error: record.validationError || '-'
      });
    });
    
    // Save workbook
    await workbook.xlsx.writeFile(filePath);
    
    return { fileName, filePath };
  } catch (error) {
    throw error;
  }
}

// Routes

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP', service: 'report-service' });
});

// Generate report
app.post('/generate', validateGenerateReport, async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const { type, fileId } = req.body;
    const userId = req.headers['user-id'];
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    // Create report record
    const report = await Report.create({
      reportType: type,
      fileName: `report-${Date.now()}`,
      filePath: '',
      generatedBy: userId,
      status: 'generating'
    });
    
    // Get data for report
    let data = [];
    let title = '';
    
    if (fileId) {
      // Check if file exists and belongs to user
      const file = await UploadedFile.findOne({
        where: { id: fileId, uploadedBy: userId }
      });
      
      if (!file) {
        await report.update({ status: 'failed' });
        return res.status(404).json({ message: 'File not found' });
      }
      
      // Get records for specific file
      data = await NICRecord.findAll({
        where: { fileId },
        order: [['id', 'ASC']]
      });
      
      title = `NIC Validation Report - ${file.originalName}`;
    } else {
      // Get all records for user
      const files = await UploadedFile.findAll({
        where: { uploadedBy: userId },
        attributes: ['id']
      });
      
      const fileIds = files.map(file => file.id);
      
      if (fileIds.length === 0) {
        await report.update({ status: 'failed' });
        return res.status(404).json({ message: 'No files found for user' });
      }
      
      data = await NICRecord.findAll({
        where: { fileId: fileIds },
        order: [['fileId', 'ASC'], ['id', 'ASC']]
      });
      
      title = 'NIC Validation Report - All Files';
    }
    
    if (data.length === 0) {
      await report.update({ status: 'failed' });
      return res.status(404).json({ message: 'No records found for report' });
    }
    
    // Generate report based on type
    let result;
    
    switch (type) {
      case 'PDF':
        result = await generatePDFReport(data, title);
        break;
      case 'CSV':
        result = await generateCSVReport(data, title);
        break;
      case 'EXCEL':
        result = await generateExcelReport(data, title);
        break;
      default:
        throw new Error('Invalid report type');
    }
    
    // Update report record
    await report.update({
      fileName: result.fileName,
      filePath: result.filePath,
      status: 'completed'
    });
    
    logger.info(`Report generated: ${result.fileName}, type: ${type}, user: ${userId}`);
    res.status(200).json({
      message: 'Report generated successfully',
      reportId: report.id,
      reportType: type
    });
  } catch (error) {
    logger.error(`Error generating report: ${error.message}`);
    res.status(500).json({ message: 'Error generating report' });
  }
});

// Download report
app.get('/download/:id', validateReportId, async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const reportId = req.params.id;
    const userId = req.headers['user-id'];
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    // Find report
    const report = await Report.findOne({
      where: { id: reportId, generatedBy: userId }
    });
    
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }
    
    if (report.status !== 'completed') {
      return res.status(400).json({ message: `Report is ${report.status}` });
    }
    
    // Check if file exists
    if (!await fs.pathExists(report.filePath)) {
      return res.status(404).json({ message: 'Report file not found' });
    }
    
    // Set content type based on report type
    let contentType;
    switch (report.reportType) {
      case 'PDF':
        contentType = 'application/pdf';
        break;
      case 'CSV':
        contentType = 'text/csv';
        break;
      case 'EXCEL':
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;
      default:
        contentType = 'application/octet-stream';
    }
    
    // Set headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${report.fileName}"`);
    
    // Stream file to response
    const fileStream = fs.createReadStream(report.filePath);
    fileStream.pipe(res);
    
    logger.info(`Report downloaded: ${report.fileName}, user: ${userId}`);
  } catch (error) {
    logger.error(`Error downloading report: ${error.message}`);
    res.status(500).json({ message: 'Error downloading report' });
  }
});

// List all reports
app.get('/list', async (req, res) => {
  try {
    const userId = req.headers['user-id'];
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    // Get all reports for user
    const reports = await Report.findAll({
      where: { generatedBy: userId },
      order: [['generatedAt', 'DESC']]
    });
    
    res.status(200).json(reports);
  } catch (error) {
    logger.error(`Error listing reports: ${error.message}`);
    res.status(500).json({ message: 'Error listing reports' });
  }
});

// Delete report
app.delete('/:id', validateReportId, async (req, res) => {
  // Check for validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const reportId = req.params.id;
    const userId = req.headers['user-id'];
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }
    
    // Find report
    const report = await Report.findOne({
      where: { id: reportId, generatedBy: userId }
    });
    
    if (!report) {
      return res.status(404).json({ message: 'Report not found' });
    }
    
    // Delete file if it exists
    if (report.filePath && await fs.pathExists(report.filePath)) {
      await fs.unlink(report.filePath);
    }
    
    // Delete report record
    await report.destroy();
    
    logger.info(`Report deleted: ${report.fileName}, user: ${userId}`);
    res.status(200).json({ message: 'Report deleted successfully' });
  } catch (error) {
    logger.error(`Error deleting report: ${error.message}`);
    res.status(500).json({ message: 'Error deleting report' });
  }
});

// Start server
async function startServer() {
  await initializeDatabase();
  
  app.listen(PORT, () => {
    console.log(`Report Service running on port ${PORT}`);
    logger.info(`Report Service started on port ${PORT}`);
  });
}

startServer().catch(error => {
  logger.error(`Failed to start server: ${error.message}`);
  process.exit(1);
});

module.exports = app; // Export for testing