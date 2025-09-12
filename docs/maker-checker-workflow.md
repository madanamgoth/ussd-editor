# Maker-Checker Workflow Documentation

## Overview

The Maker-Checker workflow is a robust version control and approval system for USSD flows that ensures quality and oversight in graph management. It implements a two-role system where:

- **Makers** create and edit USSD flows
- **Checkers** review and approve/reject changes

## Key Features

### 🛠️ Maker Capabilities
- Create new USSD flows from scratch
- Edit existing approved flows to create new versions
- Submit flows for review with detailed metadata
- View submission status and feedback

### ✅ Checker Capabilities  
- Review pending flows with comprehensive comparison tools
- Side-by-side or top-bottom visual comparison for edited flows
- Detailed change tracking and highlighting
- Approve or reject flows with comments
- Version management and tagging

### 📊 Visual Comparison System
- **New Flows**: Simple review with canvas preview
- **Edited Flows**: Advanced comparison showing:
  - Added nodes (highlighted in green)
  - Removed nodes (highlighted in red) 
  - Modified nodes (highlighted in orange)
  - Unchanged nodes for context
  - Edge/connection changes
  - Statistical summary of changes

## Workflow Process

### Maker Workflow

#### 1. Create New Flow
```
Maker clicks "Create New" → Clean canvas → Design flow → Submit for review
```

#### 2. Edit Approved Flow
```
Maker selects approved flow → Loads into canvas → Makes edits → Submit as new version
```

#### 3. Submit for Review
- Provide flow name and description
- System automatically generates version numbers
- Base version tracking for edits
- Comprehensive metadata capture

### Checker Workflow

#### 1. Review New Flow
```
Checker sees pending list → Select flow → Load in canvas → Review → Approve/Reject
```

#### 2. Review Edited Flow
```
Checker sees pending list → Select flow → Comparison view → Review changes → Approve/Reject
```

## Technical Implementation

### Data Storage
- **Browser Storage**: Uses localStorage for demo/local development
- **Git Integration**: Ready for real Git repository integration
- **Version Control**: Semantic versioning (major.minor.patch)
- **Metadata Tracking**: Complete audit trail

### File Structure
```
flows/
├── approved/    # Approved and active flows
├── pending/     # Flows awaiting review  
├── rejected/    # Rejected flows for reference
└── drafts/      # Work-in-progress flows
```

### Graph Comparison Algorithm
1. **Node Comparison**: ID-based matching with data diff
2. **Edge Analysis**: Connection changes detection
3. **Position Tracking**: Layout change awareness
4. **Change Classification**: Add/Remove/Modify categorization
5. **Visual Highlighting**: Color-coded change indicators

## User Interface Design

### Design Principles
- **Non-technical User Friendly**: Intuitive interface for business users
- **Visual Clarity**: Clear indication of changes and status
- **Responsive Design**: Works on all screen sizes
- **Accessibility**: Keyboard navigation and screen reader support

### Color Coding System
- 🟢 **Green**: Added elements
- 🔴 **Red**: Removed elements  
- 🟡 **Orange**: Modified elements
- 🔵 **Blue**: Unchanged elements
- 🟣 **Purple**: Approved status
- 🟠 **Amber**: Pending status

### Comparison View Modes
- **Side-by-Side**: Ideal for wide screens and detailed comparison
- **Top-Bottom**: Better for narrow screens and sequential review

## Sample Data

The system includes comprehensive sample data:

### Approved Flows
1. **Banking Main Menu** (v1.0.0)
   - Basic banking operations
   - Balance check, transfers, bill payments
   
2. **Mobile Money Services** (v2.1.0)
   - Mobile money operations with PIN entry
   - Multi-language support (English/Swahili)

### Pending Flows  
1. **Insurance Claims Portal** (v1.0.0) - New Flow
   - Comprehensive insurance operations
   - Multi-language support (English/French)
   - Complex workflow with multiple paths
   
2. **Enhanced Banking Menu** (v1.1.0) - Updated Flow
   - Enhanced version of Banking Main Menu
   - Added loan application and status features
   - Updated messaging and confirmations

## Configuration Options

### Workflow Settings
```javascript
const WORKFLOW_CONFIG = {
  autoVersioning: true,        // Automatic version increment
  requireComments: false,      // Mandatory reviewer comments
  maxPendingFlows: 50,        // Limit pending queue size
  notificationEnabled: true,   // Email/alert notifications
  backupInterval: 3600,       // Auto-backup interval (seconds)
  comparisonTimeout: 30000     // Comparison calculation timeout
};
```

### User Role Management
```javascript
const USER_ROLES = {
  MAKER: 'maker',             // Can create and edit
  CHECKER: 'checker',         // Can review and approve
  ADMIN: 'admin',             // Full access and configuration
  VIEWER: 'viewer'            // Read-only access
};
```

## Integration Points

### Git Repository Integration
- Automatic commit creation for each action
- Branch management for different environments
- Tag creation for approved versions
- Merge conflict resolution

### API Integration
- REST API endpoints for external systems
- Webhook notifications for status changes
- Export capabilities for downstream systems
- Audit log API for compliance

### Authentication & Authorization
- User role-based access control
- Session management
- Activity logging
- Permission matrix

## Best Practices

### For Makers
1. **Clear Naming**: Use descriptive names for flows
2. **Detailed Descriptions**: Explain the purpose and changes
3. **Incremental Changes**: Make small, focused updates
4. **Test Thoroughly**: Validate flows before submission

### For Checkers
1. **Comprehensive Review**: Check all paths and logic
2. **Change Impact**: Assess business impact of modifications
3. **Documentation**: Provide clear approval/rejection reasons
4. **Timely Review**: Process pending flows promptly

### For Administrators
1. **Regular Backups**: Maintain flow version backups
2. **Performance Monitoring**: Monitor system performance
3. **User Training**: Ensure users understand the workflow
4. **Security Updates**: Keep system components updated

## Troubleshooting

### Common Issues
1. **Large Flow Comparison**: May timeout on very complex flows
2. **Browser Storage Limits**: Local storage has size constraints
3. **Concurrent Edits**: Handle simultaneous editor conflicts
4. **Version Conflicts**: Resolve version number collisions

### Performance Optimization
- Lazy loading for large graphs
- Compression for stored flow data
- Efficient diff algorithms
- Cached comparison results

## Future Enhancements

### Planned Features
- Real-time collaboration
- Advanced search and filtering
- Automated testing integration
- Performance analytics
- Multi-environment deployment
- Advanced user management
- Integration with enterprise systems

### Scalability Considerations
- Database backend for production
- Microservices architecture
- Horizontal scaling capabilities
- CDN for asset delivery
- Caching strategies

---

*This documentation serves as a comprehensive guide for understanding and implementing the Maker-Checker workflow system. For technical implementation details, refer to the source code and inline documentation.*
