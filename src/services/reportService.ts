import jsPDF from 'jspdf';
import { Session, SessionReport } from '../types';
import { RealEyeTrackingData } from './realEyeTrackingService';

export class ReportService {
  static generateAnalytics(session: Session): SessionReport['analytics'] {
    const { data } = session;
    
    if (data.length === 0) {
      return {
        avgFixationTime: 0,
        totalBlinks: 0,
        maxPupilSize: 0,
        minPupilSize: 0,
        avgPupilSize: 0,
        focusAreas: [],
      };
    }

    const avgFixationTime = data.reduce((sum, d) => sum + d.fixationDuration, 0) / data.length;
    const totalBlinks = Math.max(...data.map(d => d.blinkCount));
    const pupilSizes = data.map(d => d.pupilSize);
    const maxPupilSize = Math.max(...pupilSizes);
    const minPupilSize = Math.min(...pupilSizes);
    const avgPupilSize = pupilSizes.reduce((sum, size) => sum + size, 0) / pupilSizes.length;

    // Generate focus areas by clustering gaze points
    const focusAreas = this.generateFocusAreas(data);

    // Calculate additional metrics for real eye tracking data
    const realData = data as RealEyeTrackingData[];
    const hasRealData = realData.length > 0 && realData[0].facialExpression;
    
    let additionalMetrics = {};
    if (hasRealData) {
      additionalMetrics = this.calculateRealDataMetrics(realData);
    }

    return {
      avgFixationTime,
      totalBlinks,
      maxPupilSize,
      minPupilSize,
      avgPupilSize,
      focusAreas,
      ...additionalMetrics,
    };
  }

  private static calculateRealDataMetrics(data: RealEyeTrackingData[]) {
    const expressions = {
      happy: 0, sad: 0, angry: 0, surprised: 0, neutral: 0, focused: 0
    };
    
    let totalEyeOpenness = { left: 0, right: 0 };
    let validExpressionCount = 0;
    let validEyeOpennessCount = 0;
    
    data.forEach(point => {
      if (point.facialExpression && typeof point.facialExpression === 'object') {
        Object.keys(expressions).forEach(key => {
          const value = point.facialExpression[key as keyof typeof expressions];
          if (typeof value === 'number' && !isNaN(value)) {
            expressions[key as keyof typeof expressions] += value;
          }
        });
        validExpressionCount++;
      }
      
      if (point.eyeOpenness && typeof point.eyeOpenness === 'object') {
        totalEyeOpenness.left += point.eyeOpenness.left;
        totalEyeOpenness.right += point.eyeOpenness.right;
        validEyeOpennessCount++;
      }
    });
    
    // Calculate averages
    if (validExpressionCount > 0) {
      Object.keys(expressions).forEach(key => {
        expressions[key as keyof typeof expressions] /= validExpressionCount;
      });
    }
    
    const avgEyeOpenness = validEyeOpennessCount > 0 ? {
      left: totalEyeOpenness.left / validEyeOpennessCount,
      right: totalEyeOpenness.right / validEyeOpennessCount
    } : { left: 0, right: 0 };
    
    return {
      avgFacialExpressions: expressions,
      avgEyeOpenness,
      dominantExpression: validExpressionCount > 0 
        ? Object.entries(expressions).reduce((a, b) => a[1] > b[1] ? a : b)[0]
        : 'neutral'
    };
  }

  private static generateFocusAreas(data: any[]) {
    const gridSize = 10; // 10x10 grid
    const grid: number[][] = Array(gridSize).fill(null).map(() => Array(gridSize).fill(0));
    
    data.forEach(point => {
      const gridX = Math.floor(point.x * (gridSize - 1));
      const gridY = Math.floor(point.y * (gridSize - 1));
      grid[gridY][gridX]++;
    });

    const focusAreas: { x: number; y: number; frequency: number }[] = [];
    
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        if (grid[y][x] > 0) {
          focusAreas.push({
            x: (x + 0.5) / gridSize,
            y: (y + 0.5) / gridSize,
            frequency: grid[y][x],
          });
        }
      }
    }

    return focusAreas.sort((a, b) => b.frequency - a.frequency).slice(0, 20);
  }

  private static generateMoodAnalysis(data: RealEyeTrackingData[]) {
    const moodData = {
      happy: { total: 0, peaks: 0, duration: 0 },
      sad: { total: 0, peaks: 0, duration: 0 },
      angry: { total: 0, peaks: 0, duration: 0 },
      surprised: { total: 0, peaks: 0, duration: 0 },
      neutral: { total: 0, peaks: 0, duration: 0 },
      focused: { total: 0, peaks: 0, duration: 0 }
    };

    let moodTimeline: { time: number; mood: string; intensity: number }[] = [];
    let validCount = 0;

    data.forEach((point, index) => {
      if (point.facialExpression && typeof point.facialExpression === 'object') {
        validCount++;
        
        // Calculate dominant mood for this point
        const expressions = point.facialExpression;
        const dominantMood = Object.entries(expressions)
          .reduce((a, b) => a[1] > b[1] ? a : b);
        
        const moodName = dominantMood[0] as keyof typeof moodData;
        const intensity = dominantMood[1];
        
        // Update mood statistics
        moodData[moodName].total += intensity;
        if (intensity > 0.6) moodData[moodName].peaks++;
        moodData[moodName].duration++;
        
        // Add to timeline (sample every 10th point to avoid too much data)
        if (index % 10 === 0) {
          moodTimeline.push({
            time: point.timestamp,
            mood: moodName,
            intensity: intensity
          });
        }
      }
    });

    // Calculate percentages and averages
    const moodSummary = Object.entries(moodData).map(([mood, data]) => ({
      mood,
      percentage: validCount > 0 ? (data.duration / validCount * 100) : 0,
      averageIntensity: data.duration > 0 ? (data.total / data.duration) : 0,
      peakMoments: data.peaks
    })).sort((a, b) => b.percentage - a.percentage);

    return { moodSummary, moodTimeline };
  }

  static async generatePDFReport(report: SessionReport): Promise<void> {
    const pdf = new jsPDF();
    const { session, analytics } = report;
    
    // Check if we have real eye tracking data with mood information
    const realData = session.data as RealEyeTrackingData[];
    const hasMoodData = realData.length > 0 && realData[0].facialExpression;
    let moodAnalysis = null;
    
    if (hasMoodData) {
      moodAnalysis = this.generateMoodAnalysis(realData);
    }
    
    // Title
    pdf.setFontSize(20);
    pdf.text('Eye Tracking & Mood Analysis Report', 20, 30);
    
    // Session details
    pdf.setFontSize(12);
    pdf.text(`Session ID: ${session.id}`, 20, 50);
    pdf.text(`Start Time: ${session.startTime.toLocaleString()}`, 20, 60);
    pdf.text(`End Time: ${session.endTime?.toLocaleString() || 'Ongoing'}`, 20, 70);
    pdf.text(`Duration: ${Math.round(session.duration / 1000)}s`, 20, 80);
    pdf.text(`Data Points: ${session.data.length}`, 20, 90);
    
    // Analytics
    pdf.setFontSize(14);
    pdf.text('Analytics Summary', 20, 110);
    pdf.setFontSize(10);
    pdf.text(`Average Fixation Time: ${analytics.avgFixationTime.toFixed(2)}ms`, 20, 125);
    pdf.text(`Total Blinks: ${analytics.totalBlinks}`, 20, 135);
    pdf.text(`Pupil Size Range: ${analytics.minPupilSize.toFixed(2)}mm - ${analytics.maxPupilSize.toFixed(2)}mm`, 20, 145);
    pdf.text(`Average Pupil Size: ${analytics.avgPupilSize.toFixed(2)}mm`, 20, 155);
    
    let yPos = 165;
    
    // Add mood analysis section
    if (moodAnalysis && moodAnalysis.moodSummary.length > 0) {
      pdf.setFontSize(14);
      pdf.text('Mood & Emotional Analysis', 20, yPos);
      yPos += 15;
      
      pdf.setFontSize(10);
      pdf.text('Emotional State Distribution:', 20, yPos);
      yPos += 10;
      
      moodAnalysis.moodSummary.forEach((mood, _index) => {
        if (mood.percentage > 1) { // Only show moods with >1% presence
          const moodText = `${mood.mood.charAt(0).toUpperCase() + mood.mood.slice(1)}: ${mood.percentage.toFixed(1)}% (Avg Intensity: ${(mood.averageIntensity * 100).toFixed(1)}%)`;
          pdf.text(`• ${moodText}`, 25, yPos);
          yPos += 8;
        }
      });
      
      yPos += 5;
      
      // Dominant mood
      const dominantMood = moodAnalysis.moodSummary[0];
      pdf.text(`Dominant Emotional State: ${dominantMood.mood.charAt(0).toUpperCase() + dominantMood.mood.slice(1)} (${dominantMood.percentage.toFixed(1)}%)`, 20, yPos);
      yPos += 10;
      
      // Peak moments
      const totalPeaks = moodAnalysis.moodSummary.reduce((sum, mood) => sum + mood.peakMoments, 0);
      pdf.text(`High-Intensity Emotional Moments: ${totalPeaks}`, 20, yPos);
      yPos += 15;
      
      // Mood timeline summary
      if (moodAnalysis.moodTimeline.length > 0) {
        pdf.text('Emotional Journey:', 20, yPos);
        yPos += 10;
        
        const timelineGroups = moodAnalysis.moodTimeline.reduce((groups: any, point) => {
          const timeKey = Math.floor((point.time - session.startTime.getTime()) / 30000); // 30-second intervals
          if (!groups[timeKey]) groups[timeKey] = [];
          groups[timeKey].push(point);
          return groups;
        }, {});
        
        Object.entries(timelineGroups).slice(0, 5).forEach(([timeKey, points]: [string, any]) => {
          const avgPoint = points.reduce((avg: any, p: any) => ({
            mood: p.mood,
            intensity: avg.intensity + p.intensity / points.length
          }), { mood: points[0].mood, intensity: 0 });
          
          const timeSeconds = parseInt(timeKey) * 30;
          pdf.text(`${timeSeconds}s: ${avgPoint.mood} (${(avgPoint.intensity * 100).toFixed(0)}%)`, 25, yPos);
          yPos += 8;
        });
      }
    }
    
    // Add eye tracking metrics if available
    if ((analytics as any).dominantExpression) {
      yPos += 5;
      pdf.text(`Avg Eye Openness: L:${((analytics as any).avgEyeOpenness.left * 100).toFixed(1)}% R:${((analytics as any).avgEyeOpenness.right * 100).toFixed(1)}%`, 20, yPos);
      yPos += 10;
    }
    
    // Focus areas
    yPos += 5;
    pdf.setFontSize(12);
    pdf.text('Top Focus Areas', 20, yPos);
    yPos += 10;
    pdf.setFontSize(10);
    analytics.focusAreas.slice(0, 5).forEach((area, index) => {
      pdf.text(
        `${index + 1}. Position (${(area.x * 100).toFixed(1)}%, ${(area.y * 100).toFixed(1)}%) - ${area.frequency} fixations`,
        20,
        yPos + index * 10
      );
    });

    // Add recommendations based on mood analysis
    if (moodAnalysis) {
      yPos += 60;
      if (yPos > 250) {
        pdf.addPage();
        yPos = 20;
      }
      
      pdf.setFontSize(12);
      pdf.text('Recommendations', 20, yPos);
      yPos += 15;
      
      pdf.setFontSize(10);
      const dominantMood = moodAnalysis.moodSummary[0];
      
      if (dominantMood.mood === 'focused') {
        pdf.text('• Great focus levels detected! Continue current work patterns.', 20, yPos);
        yPos += 8;
        pdf.text('• Consider taking breaks every 25-30 minutes to maintain focus.', 20, yPos);
      } else if (dominantMood.mood === 'happy') {
        pdf.text('• Positive emotional state detected during session.', 20, yPos);
        yPos += 8;
        pdf.text('• This suggests good engagement with the task.', 20, yPos);
      } else if (dominantMood.mood === 'neutral') {
        pdf.text('• Neutral emotional state - consider ways to increase engagement.', 20, yPos);
        yPos += 8;
        pdf.text('• Try varying task difficulty or adding interactive elements.', 20, yPos);
      } else if (dominantMood.mood === 'sad' || dominantMood.mood === 'angry') {
        pdf.text('• Negative emotions detected - consider task difficulty or environment.', 20, yPos);
        yPos += 8;
        pdf.text('• Take breaks and ensure comfortable working conditions.', 20, yPos);
      }
    }
    
    // Save the PDF
    const fileName = `eye-tracking-mood-report-${session.id.slice(0, 8)}.pdf`;
    pdf.save(fileName);
  }
}