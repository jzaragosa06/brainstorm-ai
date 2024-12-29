const path = require('path');
const fs = require('fs'); // For file operations
const express = require('express');
const multer = require('multer'); // For file uploads
const { GoogleGenerativeAI, SchemaType } = require('@google/generative-ai');

const router = express.Router();

// Initialize Google Generative AI with API key
const genAI = new GoogleGenerativeAI(process.env.API_KEY || "AIzaSyAd78ny7jD23ZLIXbuPH41TRRiscLFItOU");

// Define a schema for structured JSON response tailored for force-directed graphs
const schema = {
    description: "Nodes and links for a force-directed graph extracted from an image",
    type: SchemaType.OBJECT,
    properties: {
        nodes: {
            type: SchemaType.ARRAY,
            description: "List of nodes representing ideas from the image",
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    id: { type: SchemaType.INTEGER, description: "Unique node ID" },
                    label: { type: SchemaType.STRING, description: "Label for the node" },
                    info: { type: SchemaType.STRING, description: "Additional information about the node" }
                },
                required: ["id", "label", "info"]
            },
        },
        links: {
            type: SchemaType.ARRAY,
            description: "List of links between nodes",
            items: {
                type: SchemaType.OBJECT,
                properties: {
                    source: { type: SchemaType.INTEGER, description: "Source node ID" },
                    target: { type: SchemaType.INTEGER, description: "Target node ID" }
                },
                required: ["source", "target"]
            },
        }
    },
    required: ["nodes", "links"],
};

// Configure the model with schema and response configuration
const model = genAI.getGenerativeModel({
    model: "gemini-1.5-pro",
    generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema,
    },
});

// Configure Multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) =>
    {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) =>
    {
        cb(null, file.originalname + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Helper function to convert image file to Generative AI compatible format
function fileToGenerativePart(filePath, mimeType)
{
    return {
        inlineData: {
            data: fs.readFileSync(filePath).toString("base64"),
            mimeType,
        },
    };
}

// Function to process API response and extract nodes and links
function processGraphData(responseText)
{
    try
    {
        const responseData = JSON.parse(responseText);
        const nodes = responseData.nodes || [];
        const links = responseData.links || [];

        console.log('Extracted Nodes:', nodes);
        console.log('Extracted Links:', links);

        return { nodes, links };
    } catch (error)
    {
        console.error('Error processing graph data:', error);
        return { nodes: [], links: [] };
    }
}

// Route to render the upload page
router.get('/lab', (req, res) =>
{
    res.render('brainstorm3/lab');
});

// Route to handle image upload and processing
router.post('/upload', upload.single('image'), async (req, res) =>
{
    try
    {
        const filePath = req.file.path; // Path to the uploaded file
        const mimeType = req.file.mimetype; // Mime type of the uploaded file

        const prompt = "Extract nodes and links for a force-directed graph from the image.";
        const imagePart = fileToGenerativePart(filePath, mimeType);

        // Generate content with schema enforcement
        const result = await model.generateContent([prompt, imagePart]);

        // Extract nodes and links from structured JSON response
        const { nodes, links } = processGraphData(result.response.text());

        // Respond with structured graph data
        res.json({ nodes, links });
    } catch (error)
    {
        console.error('Error generating structured graph data from image:', error);
        res.status(500).send('An error occurred while processing the image.');
    } finally
    {
        // Clean up the uploaded file
        if (req.file && req.file.path)
        {
            fs.unlinkSync(req.file.path);
        }
    }
});

module.exports = router;