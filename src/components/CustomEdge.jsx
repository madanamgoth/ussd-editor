import React from 'react';
import { getSmoothStepPath, EdgeLabelRenderer, BaseEdge, useReactFlow } from '@xyflow/react';

const CustomEdge = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  label,
  labelStyle,
  labelBgStyle,
  animated,
}) => {
  const { deleteElements } = useReactFlow();

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Calculate position near target (80% along the path)
  const pathLength = Math.sqrt((targetX - sourceX) ** 2 + (targetY - sourceY) ** 2);
  const t = 0.8; // 80% along the path
  const nearTargetX = sourceX + (targetX - sourceX) * t;
  const nearTargetY = sourceY + (targetY - sourceY) * t;

  const onEdgeClick = (evt, id) => {
    evt.stopPropagation();
    deleteElements({ edges: [{ id }] });
  };

  return (
    <>
      <BaseEdge 
        path={edgePath} 
        markerEnd={markerEnd} 
        style={{
          ...style,
          strokeDasharray: animated ? '5 5' : undefined,
          animation: animated ? 'flow 1s linear infinite' : undefined,
        }} 
      />
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${nearTargetX}px,${nearTargetY}px)`,
              fontSize: '12px',
              fontWeight: 600,
              background: labelBgStyle?.fill || 'white',
              border: `1px solid ${labelBgStyle?.stroke || '#666'}`,
              borderRadius: '4px',
              padding: '4px 8px',
              pointerEvents: 'all',
              ...labelStyle,
            }}
            className="nodrag nopan"
            onClick={(event) => onEdgeClick(event, id)}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export default CustomEdge;
