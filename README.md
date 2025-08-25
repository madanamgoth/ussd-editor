# USSD Menu Manager - Drag & Drop Editor

A powerful drag-and-drop editor for creating USSD menu flows with multi-language support and AI-powered flow generation.

## Features

### 🎯 Drag & Drop Interface
- **5 Node Types**: START, MENU, INPUT, ACTION, END
- **Visual Canvas**: React Flow-powered interactive canvas
- **Real-time Editing**: Double-click to edit node properties
- **Smart Connections**: Auto-connect nodes with colored edges

### 🌍 Multi-language Support
- **4 Languages**: English, Spanish, French, Arabic
- **Prompt Management**: Edit prompts for each language
- **Consistent Structure**: Maintain flow logic across languages

### 🤖 AI Flow Generator
- **Natural Language Input**: Describe your flow in plain English
- **Smart Detection**: Automatically detects node types and connections
- **Template Suggestions**: Pre-built templates for common flows
- **Instant Generation**: Creates complete flows with positioning

### ⚡ Node Types

#### START Node
- Entry point of the flow
- Multi-language welcome messages
- Single output connection

#### MENU Node
- Multiple choice options (1. Option 1, 2. Option 2, etc.)
- Dynamic handles based on menu items
- Fallback option support
- Multi-language menu translations

#### INPUT Node
- Collect user input
- Configurable storage attributes
- Pattern matching (*, numbers only, letters only)
- Input validation options

#### ACTION Node
- API call execution
- Template creation with AI metadata
- Response code handling (200, 400, 500)
- Multiple output paths

#### END Node
- Flow termination
- Final messages
- Multi-language goodbye text

### 🛠️ Advanced Features

#### Flow Controls
- **Export/Import**: JSON format for easy sharing
- **Validation**: Check for errors and warnings
- **Auto Layout**: Automatically arrange nodes
- **Clear All**: Reset canvas

#### Template Creator
- **AI Integration**: Create templates with metadata
- **Parameter Management**: Define API parameters
- **Method Selection**: GET, POST, PUT, DELETE
- **Response Handling**: Configure success/error responses

## Getting Started

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd ussd-editor

# Install dependencies
npm install

# Start the development server
npm run dev
```

### Basic Usage

1. **Create Nodes**: Drag node types from the palette to the canvas
2. **Edit Properties**: Double-click node titles to rename
3. **Configure Prompts**: Edit multi-language prompts in each node
4. **Connect Nodes**: Drag from output handles to input handles
5. **Export Flow**: Use the export button to get JSON format

### AI Flow Generation

1. Click the "🤖 AI Generate Flow" button
2. Describe your flow in natural language
3. Example: "Login with PIN → validate → main menu with balance and transfer → actions → end"
4. Click "Generate Flow" to create the complete structure

## Flow Examples

### Banking Flow
```
Welcome to mobile banking → enter PIN → validate user → main menu (balance/transfer) → process action → thank you
```

### Payment Flow
```
Payment service → enter mobile number → enter amount → validate payment → confirm → success message
```

### Bill Payment
```
Bill payment → select bill type → enter account → enter amount → validate → pay → receipt
```

## JSON Schema

### Export Format
```json
[
  {
    "id": "start_1",
    "type": "START",
    "prompts": {
      "en": "Welcome to our service",
      "es": "Bienvenido a nuestro servicio",
      "fr": "Bienvenue dans notre service",
      "ar": "مرحباً بكم في خدمتنا"
    },
    "transitions": { "": "menu_2" },
    "fallback": ""
  },
  {
    "id": "menu_2",
    "type": "MENU",
    "prompts": {
      "en": "1. Balance\n2. Transfer",
      "es": "1. Saldo\n2. Transferir",
      "fr": "1. Solde\n2. Transfert",
      "ar": "1. الرصيد\n2. تحويل"
    },
    "transitions": { "1": "action_3", "2": "action_4" },
    "fallback": "end_5"
  }
]
```

### Canvas Format
```json
{
  "nodes": [
    {
      "id": "start_1",
      "type": "start",
      "position": { "x": 100, "y": 100 },
      "data": {
        "label": "Welcome",
        "type": "START",
        "config": { /* node configuration */ }
      },
      "measured": { "width": 200, "height": 120 }
    }
  ],
  "edges": [
    {
      "id": "edge_1",
      "source": "start_1",
      "target": "menu_2",
      "type": "smoothstep",
      "animated": true
    }
  ]
}
```

## Validation Rules

### Errors
- ❌ Missing START node
- ❌ Invalid node connections
- ❌ Circular dependencies

### Warnings
- ⚠️ Multiple START nodes
- ⚠️ No END nodes
- ⚠️ Orphaned nodes
- ⚠️ Missing transitions

## Development

### Project Structure
```
src/
├── components/
│   ├── NodeTypes/          # Individual node components
│   ├── NodePalette.jsx     # Drag & drop palette
│   ├── FlowControls.jsx    # Export/import controls
│   └── AIFlowGenerator.jsx # AI-powered generator
├── utils/
│   ├── flowUtils.js        # Flow management utilities
│   └── flowGenerator.js    # AI flow generation logic
├── styles/
│   └── editor.css          # Application styles
└── App.jsx                 # Main application component
```

### Tech Stack
- **React 19**: UI framework
- **React Flow**: Canvas and node management
- **Vite**: Build tool and dev server
- **CSS**: Custom styling (no external UI library)

### Adding New Node Types

1. Create component in `src/components/NodeTypes/`
2. Add to `nodeTypes` object in `index.js`
3. Update `flowUtils.js` for node creation
4. Add styles in `editor.css`

### Extending AI Generator

1. Update patterns in `flowGenerator.js`
2. Add new template mappings
3. Extend translation dictionaries
4. Add validation rules

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review example flows

---

Built with ❤️ using React Flow and modern web technologies+ Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
