const axios = require('axios');

// ============== CONFIGURATION ==============
const CONFIG = {
  BEARER_TOKEN: 'eyJ4NXQiOiJNV0l5TkRJNVlqRTJaV1kxT0RNd01XSTNOR1ptTVRZeU5UTTJOVFZoWlRnMU5UTTNaVE5oTldKbVpERTFPVEE0TldFMVlUaGxNak5sTldFellqSXlZUSIsImtpZCI6Ik1XSXlOREk1WWpFMlpXWTFPRE13TVdJM05HWm1NVFl5TlRNMk5UVmhaVGcxTlRNM1pUTmhOV0ptWkRFMU9UQTROV0UxWVRobE1qTmxOV0V6WWpJeVlRX1JTMjU2IiwidHlwIjoiYXQrand0IiwiYWxnIjoiUlMyNTYifQ.eyJzdWIiOiI3NDg0OTBmYi0xNWRjLTRmNDMtYTRiZC1lN2Y4NDZkMDA1OTYiLCJhdXQiOiJBUFBMSUNBVElPTiIsImF1ZCI6IjdhQVVSeThneXQwaUw4RlFUQ2lxNUZFSTNhZ2EiLCJuYmYiOjE3ODU0OTk3MDIsImF6cCI6IjdhQVVSeThneXQwaUw4RlFUQ2lxNUZFSTNhZ2EiLCJzY29wZSI6ImRlZmF1bHQiLCJpc3MiOiJodHRwczpcL1wvbG9jYWxob3N0Ojk0NDNcL29hdXRoMlwvdG9rZW4iLCJleHAiOjE4MDEyNzgxNzgsImlhdCI6MTc4NTQ5OTcwMiwianRpIjoiNzg1ZjUxYWQtM2EyZS00YWRlLWE2ZjMtNDE3MjliMWUyZmQ3IiwiY2xpZW50X2lkIjoiN2FBVVJ5OGd5dDBpTDhGUVRDaXE1RkVJM2FnYSJ9.lSDm_bpFahi7-l3nXMQUTUVM_CKzlg0zm3wjUCl5XtQTdx0enSj84lGXk_9s91-YXINTIl0iMf0DhSRSQRhwuJ0MnldiXFvNLjj5QtPb17zFfWMSSJJ0YuHVTuvrW3ejMNa9vtwM4eszvwpX0_Ln_IJrhsIe2_Dex5tAKpqumoufUYqQjOHBOqfkiwzrfR9StA_AKRQ42VXEiJXIcBqxL5wFLg8G4-LpV2kITWH8GeBDHEO4eoGB_mR4CPLBDAm4Y6DIWHg4AgfsGAwJJzd1kYjLxKGg82T7Ozt8XteUVrj8Lvhj2xKUBmQ0exg0OAwyb69UOsEsip4f4NokMuV1_w',
  API_URL: 'https://api.fbr.gov.pk/iris2ovs/v1/getdata',
  TIMEOUT: 30000,
  CREDIT: 'https://t.me/AZ_Tricks'
};

// ============== MAIN HANDLER ==============
module.exports = async (req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  
  // Allow both GET and POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method Not Allowed',
      credit: CONFIG.CREDIT
    });
  }

  try {
    // Get CNIC from different sources
    let cnic = '';
    
    // GET request: /api/cnic=4220171565645
    if (req.method === 'GET') {
      const path = req.url;
      const match = path.match(/cnic[=:]([\d-]+)/i);
      if (match) {
        cnic = match[1];
      }
    }
    
    // POST request: body mein se
    if (req.method === 'POST') {
      cnic = req.body.cnic || req.body.identifier || req.body.CNIC || '';
    }
    
    // Clean CNIC - Remove all non-numeric characters
    cnic = cnic.replace(/\D/g, '');
    
    if (!cnic || cnic.length !== 13) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid CNIC', 
        message: 'CNIC must be 13 digits',
        example: '/api/cnic=4220171565645',
        credit: CONFIG.CREDIT
      });
    }

    // Call FBR API
    const response = await axios.post(
      CONFIG.API_URL,
      {
        protocolId: '1003',
        outputType: '4',
        identifierType: 'CNIC',
        identifier: cnic,
        date: ''
      },
      {
        headers: {
          'Authorization': `Bearer ${CONFIG.BEARER_TOKEN}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/plain, */*',
          'Origin': 'https://iris.fbr.gov.pk',
          'Referer': 'https://iris.fbr.gov.pk/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        timeout: CONFIG.TIMEOUT
      }
    );

    // Parse response
    const htmlData = response.data?.Entries?.Entry?.[0]?.Response || '';
    const parsed = parseHTML(htmlData);
    
    // Get Reference No
    const referenceNo = parsed['Reference No'] || 'Not Found';
    
    // NTN = Reference No (same value)
    const ntn = referenceNo;

    // Create final response - Reference No and NTN both same
    const finalData = {
      ...parsed,
      'NTN': ntn  // NTN same as Reference No
    };

    res.status(200).json({
      success: true,
      cnic: cnic,
      data: finalData,
      credit: CONFIG.CREDIT
    });

  } catch (error) {
    console.error('Error:', error.message);
    
    if (error.response?.status === 401) {
      return res.status(401).json({
        success: false,
        error: 'Session Expired',
        message: 'Token needs renewal',
        credit: CONFIG.CREDIT
      });
    }

    res.status(error.response?.status || 500).json({
      success: false,
      error: error.response?.data || error.message,
      credit: CONFIG.CREDIT
    });
  }
};

// ============== HTML PARSER ==============
function parseHTML(html) {
  if (!html) return {};

  const result = {};
  const regex = /<th[^>]*>(.*?)<\/th>\s*<td>(.*?)<\/td>/gi;
  let match;

  while ((match = regex.exec(html)) !== null) {
    const key = match[1].trim();
    const value = match[2].trim();
    result[key] = value;
  }

  return result;
      }
