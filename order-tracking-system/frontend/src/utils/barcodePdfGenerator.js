// frontend/src/utils/barcodePdfGenerator.js
import { jsPDF } from 'jspdf';
import JsBarcode from 'jsbarcode';
import { adminAPI } from '../api/admin';

/**
 * Generate and save PDF with barcode
 * @param {string} text - Text to encode in barcode
 * @param {string} orderNumber - Order number to display at bottom (optional)
 * @param {string} clientName - Client name to display at bottom (optional)
 * @param {Object} options - Barcode and PDF options
 * @returns {Blob} - PDF file as Blob
 */
export const generateBarcodePDF = async (text, orderNumber = '', clientName = '', options = {}) => {
  // Validate text input
  if (!text || typeof text !== 'string' || text.trim() === '') {
    console.error('Invalid barcode text input');
    return;
  }

  // Fetch barcode settings from admin_settings
  let barcodeSettings = {
    barcodeFormat: 'CODE128',
    barcodeWidth: 2,
    barcodeHeight: 100,
    displayValue: true,
    fontSize: 20,
    margin: 10,
    textMargin: 2
  };

  try {
    // Get barcode settings from admin_settings table
    const response = await adminAPI.getBarcodeSettings();
    if (response.data && response.data.settings) {
      barcodeSettings = {
        barcodeFormat: response.data.settings.format || barcodeSettings.barcodeFormat,
        barcodeWidth: response.data.settings.width || barcodeSettings.barcodeWidth,
        barcodeHeight: response.data.settings.height || barcodeSettings.barcodeHeight,
        displayValue: response.data.settings.displayValue !== undefined 
          ? response.data.settings.displayValue 
          : barcodeSettings.displayValue,
        fontSize: response.data.settings.fontSize || barcodeSettings.fontSize,
        margin: response.data.settings.margin || barcodeSettings.margin,
        textMargin: response.data.settings.textMargin || barcodeSettings.textMargin
      };
    }
  } catch (error) {
    console.warn('Could not fetch barcode settings, using defaults:', error);
    // Continue with default settings if fetch fails
  }

  // Merge settings with options
  const {
    filename = `barcode_${text}.pdf`,
    copies = 1,
    pageSize = 'a6', // A6 is a good size for barcode label
    margins = { top: 10, right: 10, bottom: 10, left: 10 }
  } = options;

  // Use settings from admin_settings table
  const {
    barcodeFormat,
    barcodeWidth,
    barcodeHeight,
    displayValue,
    fontSize,
    margin,
    textMargin
  } = barcodeSettings;

  // Create new PDF document
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: pageSize
  });

  // Calculate page dimensions
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Create barcode as SVG
  const canvas = document.createElement('canvas');
  try {
    JsBarcode(canvas, text, {
      format: barcodeFormat,
      width: barcodeWidth,
      height: barcodeHeight,
      displayValue: displayValue,
      fontSize: fontSize,
      margin: margin,
      textMargin: textMargin
    });
  } catch (error) {
    console.error('Error generating barcode:', error);
    return;
  }
  
  const barcodeDataUrl = canvas.toDataURL('image/png');

  // Create multiple copies if requested
  for (let i = 0; i < copies; i++) {
    if (i > 0) {
      doc.addPage();
    }

    // Add barcode centered on page
    const barcodeWidth = pageWidth - margins.left - margins.right;
    const barcodeX = margins.left;
    const barcodeY = margins.top;
    
    doc.addImage(
      barcodeDataUrl, 
      'PNG', 
      barcodeX, 
      barcodeY, 
      barcodeWidth, 
      barcodeHeight / 2 // Adjust height to fit nicely on page
    );

    // Calculate position right under the barcode
    let yPosition = barcodeY + (barcodeHeight / 2) + 10;
    
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    
    if (orderNumber) {
      doc.text(`Order : ${orderNumber}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 8;
    } 
    
    if (clientName) {
      doc.text(`Client : ${clientName}`, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 8;
    }
    
    // Reset font for other information
    doc.setFont(undefined, 'normal');
  }

  // Save the PDF
  try {
    doc.save(filename);
  } catch (error) {
    console.error('Error saving PDF:', error);
  }
  
  // Return the PDF as a Blob for further use if needed
  return doc.output('blob');
};

/**
 * Generate and download a barcode as JPEG image
 * @param {string} text - Text to encode in barcode
 * @param {string} orderNumber - Order number to display at bottom (optional)
 * @param {string} clientName - Client name to display at bottom (optional)
 * @param {Object} options - Barcode and image options
 * @returns {string} - Data URL of the JPEG image
 */
export const generateBarcodeJPEG = async (text, orderNumber = '', clientName = '', options = {}) => {
  // Validate text input
  if (!text || typeof text !== 'string' || text.trim() === '') {
    console.error('Invalid barcode text input');
    return null;
  }

  // Fetch barcode settings from admin_settings
  let barcodeSettings = {
    barcodeFormat: 'CODE128',
    barcodeWidth: 2,
    barcodeHeight: 100,
    displayValue: true,
    fontSize: 20,
    margin: 10,
    textMargin: 2
  };

  try {
    // Get barcode settings from admin_settings table
    const response = await adminAPI.getBarcodeSettings();
    if (response.data && response.data.settings) {
      barcodeSettings = {
        barcodeFormat: response.data.settings.format || barcodeSettings.barcodeFormat,
        barcodeWidth: response.data.settings.width || barcodeSettings.barcodeWidth,
        barcodeHeight: response.data.settings.height || barcodeSettings.barcodeHeight,
        displayValue: response.data.settings.displayValue !== undefined 
          ? response.data.settings.displayValue 
          : barcodeSettings.displayValue,
        fontSize: response.data.settings.fontSize || barcodeSettings.fontSize,
        margin: response.data.settings.margin || barcodeSettings.margin,
        textMargin: response.data.settings.textMargin || barcodeSettings.textMargin
      };
    }
  } catch (error) {
    console.warn('Could not fetch barcode settings for JPEG, using defaults:', error);
    // Continue with default settings if fetch fails
  }

  const {
    filename = `barcode_${text}.jpg`,
    backgroundColor = '#ffffff',
    padding = 20,
    quality = 0.95 // JPEG quality (0.0 to 1.0)
  } = options;

  // Use settings from admin_settings table
  const {
    barcodeFormat,
    barcodeWidth,
    barcodeHeight,
    displayValue,
    fontSize,
    margin,
    textMargin
  } = barcodeSettings;

  try {
    // Create canvas for the barcode
    const canvas = document.createElement('canvas');
    
    // Generate the barcode on the canvas
    JsBarcode(canvas, text, {
      format: barcodeFormat,
      width: barcodeWidth,
      height: barcodeHeight,
      displayValue: displayValue,
      fontSize: fontSize,
      margin: margin,
      textMargin: textMargin
    });
    
    // Get the dimensions of the barcode canvas
    const bWidth = canvas.width;
    const bHeight = canvas.height;
    
    // Create a new canvas with additional space for text and padding
    const finalCanvas = document.createElement('canvas');
    const finalCtx = finalCanvas.getContext('2d');
    
    // Calculate text height
    const textHeight = (orderNumber || clientName) ? 60 : 0;
    
    // Set final canvas dimensions
    finalCanvas.width = bWidth + (padding * 2);
    finalCanvas.height = bHeight + textHeight + (padding * 2);
    
    // Fill background
    finalCtx.fillStyle = backgroundColor;
    finalCtx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
    
    // Draw barcode on the new canvas
    finalCtx.drawImage(canvas, padding, padding);
    
    // Add text if provided
    if (orderNumber || clientName) {
      finalCtx.font = 'bold 14px Arial';
      finalCtx.textAlign = 'center';
      finalCtx.fillStyle = '#000000';
      
      let yPos = bHeight + padding + 20;
      
      if (orderNumber) {
        finalCtx.fillText(`Order: ${orderNumber}`, finalCanvas.width / 2, yPos);
        yPos += 20;
      }
      
      if (clientName) {
        finalCtx.fillText(`Client: ${clientName}`, finalCanvas.width / 2, yPos);
      }
    }
    
    // Convert to JPEG data URL
    const jpegDataURL = finalCanvas.toDataURL('image/jpeg', quality);
    
    // Create download link
    const downloadLink = document.createElement('a');
    downloadLink.href = jpegDataURL;
    downloadLink.download = filename;
    
    // Trigger download
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    
    return jpegDataURL;
  } catch (error) {
    console.error('Error generating JPEG barcode:', error);
    return null;
  }
};