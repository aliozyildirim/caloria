import React from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface CircularProgressProps {
  percentage?: number;
  progress?: number;
  radius?: number;
  size?: number;
  strokeWidth: number;
  color: string;
  backgroundColor: string;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  percentage,
  progress,
  radius,
  size,
  strokeWidth,
  color,
  backgroundColor,
}) => {
  // Support both old and new prop names
  let progressValue = progress !== undefined ? progress : percentage || 0;
  
  // If progress is between 0-1, convert to percentage
  if (progressValue <= 1) {
    progressValue = progressValue * 100;
  }
  
  const circleRadius = radius !== undefined ? radius : (size || 40) / 2;
  
  const circumference = 2 * Math.PI * circleRadius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (progressValue / 100) * circumference;

  const svgSize = circleRadius * 2 + strokeWidth;

  return (
    <View>
      <Svg width={svgSize} height={svgSize}>
        {/* Background circle */}
        <Circle
          cx={circleRadius + strokeWidth / 2}
          cy={circleRadius + strokeWidth / 2}
          r={circleRadius}
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        {/* Progress circle */}
        <Circle
          cx={circleRadius + strokeWidth / 2}
          cy={circleRadius + strokeWidth / 2}
          r={circleRadius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${circleRadius + strokeWidth / 2} ${circleRadius + strokeWidth / 2})`}
        />
      </Svg>
    </View>
  );
}; 