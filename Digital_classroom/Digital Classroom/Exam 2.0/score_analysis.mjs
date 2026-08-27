import PDFDocument from "pdfkit";
import fs from "node:fs";

export function computeAnalytics(payload) {
  const students = payload.students || [];
  const questions = payload.questions || [];
  const totalMarks = payload.total_marks || 100;
  
  const totalStudents = students.length;
  if (totalStudents === 0) {
    return {
      total_students: 0,
      average_score: 0,
      median_score: 0,
      highest_score: 0,
      lowest_score: 0,
      score_range: 0,
      pass_count: 0,
      fail_count: 0,
      pass_rate: 0,
      grade_distribution: { "A+": 0, "A": 0, "B": 0, "C": 0, "D": 0, "F": 0 },
      grade_percentages: { "A+": 0, "A": 0, "B": 0, "C": 0, "D": 0, "F": 0 },
      question_analysis: [],
      hardest_question: null,
      easiest_question: null,
      topic_performance: [],
      weakest_topic: null,
      strongest_topic: null,
      difficulty_analysis: [],
      time_analysis: { average_time: 0, fastest_student: null, slowest_student: null, time_distribution: {}, correlation: 0 },
      students: [],
      outliers: { top_performers: [], low_performers: [], at_risk: [] }
    };
  }

  // Scores
  const scores = students.map(s => s.score);
  const sumScores = scores.reduce((a, b) => a + b, 0);
  const averageScore = Number((sumScores / totalStudents).toFixed(2));
  
  // Median
  const sortedScores = [...scores].sort((a, b) => a - b);
  let medianScore = 0;
  const mid = Math.floor(totalStudents / 2);
  if (totalStudents % 2 !== 0) {
    medianScore = sortedScores[mid];
  } else {
    medianScore = Number(((sortedScores[mid - 1] + sortedScores[mid]) / 2).toFixed(2));
  }
  
  const highestScore = Math.max(...scores);
  const lowestScore = Math.min(...scores);
  const scoreRange = highestScore - lowestScore;
  
  const passMark = totalMarks * 0.5;
  const passStudents = students.filter(s => s.score >= passMark);
  const passCount = passStudents.length;
  const failCount = totalStudents - passCount;
  const passRate = Number(((passCount / totalStudents) * 100).toFixed(2));
  
  // Grade distribution
  const gradeDistribution = { "A+": 0, "A": 0, "B": 0, "C": 0, "D": 0, "F": 0 };
  
  students.forEach(s => {
    const pct = (s.score / totalMarks) * 100;
    let grade = "F";
    if (pct >= 90) grade = "A+";
    else if (pct >= 80) grade = "A";
    else if (pct >= 70) grade = "B";
    else if (pct >= 60) grade = "C";
    else if (pct >= 50) grade = "D";
    s.percentage = Number(pct.toFixed(2));
    s.grade = grade;
    gradeDistribution[grade]++;
  });
  
  const gradePercentages = {};
  for (const grade in gradeDistribution) {
    gradePercentages[grade] = Number(((gradeDistribution[grade] / totalStudents) * 100).toFixed(2));
  }
  
  // Student Ranking & Percentile
  const rankedStudents = [...students].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.time_taken_minutes - b.time_taken_minutes;
  });
  
  rankedStudents.forEach((s, idx) => {
    s.rank = idx + 1;
    s.percentile = Number((((totalStudents - s.rank) / totalStudents) * 100).toFixed(2));
  });
  
  // Question Analysis
  const questionAnalysis = questions.map(q => {
    let totalAttempts = 0;
    let correctAttempts = 0;
    
    students.forEach(s => {
      const ans = s.answers[q.question_id];
      if (ans !== undefined && ans !== null && ans !== "") {
        totalAttempts++;
        if (String(ans).trim().toLowerCase() === String(q.correct_answer).trim().toLowerCase()) {
          correctAttempts++;
        }
      }
    });
    
    if (totalAttempts === 0) {
      totalAttempts = totalStudents;
    }
    
    const incorrectAttempts = totalAttempts - correctAttempts;
    const correctRate = totalAttempts > 0 ? Number(((correctAttempts / totalAttempts) * 100).toFixed(2)) : 0;
    
    return {
      question_id: q.question_id,
      type: q.type,
      topic: q.topic,
      difficulty: q.difficulty,
      correct_answer: q.correct_answer,
      marks: q.marks,
      total_attempts: totalAttempts,
      correct_attempts: correctAttempts,
      incorrect_attempts: incorrectAttempts,
      correct_rate: correctRate
    };
  });
  
  // Easiest / Hardest questions
  let easiestQuestion = null;
  let hardestQuestion = null;
  if (questionAnalysis.length > 0) {
    const sortedByCorrectRate = [...questionAnalysis].sort((a, b) => a.correct_rate - b.correct_rate);
    hardestQuestion = sortedByCorrectRate[0];
    easiestQuestion = sortedByCorrectRate[sortedByCorrectRate.length - 1];
  }
  
  // Topic Performance Analysis
  const topicGroups = {};
  questionAnalysis.forEach(q => {
    if (!topicGroups[q.topic]) {
      topicGroups[q.topic] = { totalQuestions: 0, sumCorrectRate: 0, correctAttempts: 0, totalAttempts: 0 };
    }
    topicGroups[q.topic].totalQuestions++;
    topicGroups[q.topic].sumCorrectRate += q.correct_rate;
    topicGroups[q.topic].correctAttempts += q.correct_attempts;
    topicGroups[q.topic].totalAttempts += q.total_attempts;
  });
  
  const topicPerformance = Object.keys(topicGroups).map(topicName => {
    const group = topicGroups[topicName];
    const accuracy = group.totalAttempts > 0 ? Number(((group.correctAttempts / group.totalAttempts) * 100).toFixed(2)) : 0;
    return {
      topic: topicName,
      total_questions: group.totalQuestions,
      accuracy: accuracy
    };
  });
  
  let weakestTopic = null;
  let strongestTopic = null;
  if (topicPerformance.length > 0) {
    const sortedTopics = [...topicPerformance].sort((a, b) => a.accuracy - b.accuracy);
    weakestTopic = sortedTopics[0];
    strongestTopic = sortedTopics[sortedTopics.length - 1];
  }
  
  // Difficulty Analysis
  const difficultyGroups = {
    Easy: { correctAttempts: 0, totalAttempts: 0 },
    Medium: { correctAttempts: 0, totalAttempts: 0 },
    Hard: { correctAttempts: 0, totalAttempts: 0 }
  };
  
  questionAnalysis.forEach(q => {
    const diff = q.difficulty || "Medium";
    if (!difficultyGroups[diff]) {
      difficultyGroups[diff] = { correctAttempts: 0, totalAttempts: 0 };
    }
    difficultyGroups[diff].correctAttempts += q.correct_attempts;
    difficultyGroups[diff].totalAttempts += q.total_attempts;
  });
  
  const difficultyAnalysis = Object.keys(difficultyGroups).map(diff => {
    const group = difficultyGroups[diff];
    const accuracy = group.totalAttempts > 0 ? Number(((group.correctAttempts / group.totalAttempts) * 100).toFixed(2)) : 0;
    const failureRate = Number((100 - accuracy).toFixed(2));
    return {
      difficulty: diff,
      accuracy: accuracy,
      failure_rate: failureRate
    };
  });
  
  // Time Analysis
  const times = students.map(s => s.time_taken_minutes);
  const sumTimes = times.reduce((a, b) => a + b, 0);
  const averageTime = Number((sumTimes / totalStudents).toFixed(2));
  
  const sortedByTime = [...students].sort((a, b) => a.time_taken_minutes - b.time_taken_minutes);
  const fastestStudent = sortedByTime[0];
  const slowestStudent = sortedByTime[sortedByTime.length - 1];
  
  const timeDistribution = {
    "Under 15m": 0,
    "15m to 30m": 0,
    "30m to 45m": 0,
    "45m to 60m": 0,
    "Over 60m": 0
  };
  students.forEach(s => {
    const t = s.time_taken_minutes;
    if (t < 15) timeDistribution["Under 15m"]++;
    else if (t <= 30) timeDistribution["15m to 30m"]++;
    else if (t <= 45) timeDistribution["30m to 45m"]++;
    else if (t <= 60) timeDistribution["45m to 60m"]++;
    else timeDistribution["Over 60m"]++;
  });
  
  // Pearson Correlation (time vs score)
  let correlation = 0;
  if (totalStudents > 1) {
    const x = scores;
    const y = times;
    const n = totalStudents;
    
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;
    for (let i = 0; i < n; i++) {
      sumX += x[i];
      sumY += y[i];
      sumXY += x[i] * y[i];
      sumX2 += x[i] * x[i];
      sumY2 += y[i] * y[i];
    }
    
    const num = n * sumXY - sumX * sumY;
    const den = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    correlation = den !== 0 ? Number((num / den).toFixed(4)) : 0;
  }
  
  // Outliers
  const topPerformers = rankedStudents.filter(s => s.percentile >= 90);
  const lowPerformers = rankedStudents.filter(s => s.percentile <= 10);
  const atRiskStudents = rankedStudents.filter(s => s.score < passMark && s.time_taken_minutes > averageTime);
  
  return {
    exam_id: payload.exam_id || "EXAM_DRAFT",
    class_id: payload.class_id || "CLASS_A",
    exam_name: payload.exam_name || "Exam Analysis Report",
    total_marks: totalMarks,
    total_students: totalStudents,
    average_score: averageScore,
    median_score: medianScore,
    highest_score: highestScore,
    lowest_score: lowestScore,
    score_range: scoreRange,
    pass_count: passCount,
    fail_count: failCount,
    pass_rate: passRate,
    grade_distribution: gradeDistribution,
    grade_percentages: gradePercentages,
    question_analysis: questionAnalysis,
    hardest_question: hardestQuestion,
    easiest_question: easiestQuestion,
    topic_performance: topicPerformance,
    weakest_topic: weakestTopic,
    strongest_topic: strongestTopic,
    difficulty_analysis: difficultyAnalysis,
    time_analysis: {
      average_time: averageTime,
      fastest_student: fastestStudent ? { name: fastestStudent.name, time: fastestStudent.time_taken_minutes } : null,
      slowest_student: slowestStudent ? { name: slowestStudent.name, time: slowestStudent.time_taken_minutes } : null,
      time_distribution: timeDistribution,
      correlation: correlation
    },
    students: rankedStudents,
    outliers: {
      top_performers: topPerformers.map(s => ({ name: s.name, score: s.score, grade: s.grade })),
      low_performers: lowPerformers.map(s => ({ name: s.name, score: s.score, grade: s.grade })),
      at_risk: atRiskStudents.map(s => ({ name: s.name, score: s.score, time: s.time_taken_minutes }))
    }
  };
}

export function computeInsights(data) {
  const insights = [];
  
  if (data.pass_rate >= 85) {
    insights.push({
      type: "success",
      title: "Strong Overall Pass Rate",
      text: `The class achieved a pass rate of ${data.pass_rate}%, showing solid mastery of the material.`
    });
  } else if (data.pass_rate < 60) {
    insights.push({
      type: "danger",
      title: "Performance Below Benchmark",
      text: `Class pass rate is ${data.pass_rate}%, which is below the target benchmark of 60%. Remediation is recommended.`
    });
  } else {
    insights.push({
      type: "warning",
      title: "Moderate Pass Rate",
      text: `Class pass rate is ${data.pass_rate}%. Focus on supporting borderline students.`
    });
  }
  
  if (data.weakest_topic && data.weakest_topic.accuracy < 50) {
    insights.push({
      type: "danger",
      title: `Critical Topic Focus: ${data.weakest_topic.topic}`,
      text: `Topic accuracy in "${data.weakest_topic.topic}" is low (${data.weakest_topic.accuracy}%). This topic requires dedicated revision and review sessions.`
    });
  } else if (data.weakest_topic) {
    insights.push({
      type: "warning",
      title: `Review Topic: ${data.weakest_topic.topic}`,
      text: `Topic accuracy in "${data.weakest_topic.topic}" is ${data.weakest_topic.accuracy}%. It is the weakest area and could benefit from reinforcement.`
    });
  }
  
  if (data.strongest_topic && data.strongest_topic.accuracy >= 80) {
    insights.push({
      type: "success",
      title: `Class Strength: ${data.strongest_topic.topic}`,
      text: `The class demonstrated outstanding understanding of "${data.strongest_topic.topic}" with an accuracy of ${data.strongest_topic.accuracy}%.`
    });
  }
  
  const corr = data.time_analysis.correlation;
  if (corr < -0.3) {
    insights.push({
      type: "warning",
      title: "Time vs. Score Negative Correlation",
      text: `Correlation is ${corr}. Faster students tended to achieve higher scores, while slower students struggled. Time management support may help.`
    });
  } else if (corr > 0.3) {
    insights.push({
      type: "info",
      title: "Time vs. Score Positive Correlation",
      text: `Correlation is ${corr}. Students who spent more time on the exam achieved higher scores, indicating patience paid off.`
    });
  } else {
    insights.push({
      type: "info",
      title: "No Significant Time-Score Correlation",
      text: `Correlation is ${corr}. Time spent did not significantly impact exam scores across the class.`
    });
  }
  
  if (data.outliers.at_risk.length > 0) {
    insights.push({
      type: "danger",
      title: "At-Risk Students Identified",
      text: `${data.outliers.at_risk.length} student(s) are classified as at-risk (failed the exam despite spending more than average time). They may require personalized intervention.`
    });
  }
  
  return insights;
}

// Draw Arc Helper for PDFKit
function drawPieSlice(doc, cx, cy, radius, startDeg, endDeg, color) {
  doc.save();
  doc.fillColor(color);
  
  // Calculate endpoint coordinates to explicitly close the path
  const startRad = (startDeg - 90) * Math.PI / 180;
  const endRad = (endDeg - 90) * Math.PI / 180;
  
  const x1 = cx + radius * Math.cos(startRad);
  const y1 = cy + radius * Math.sin(startRad);
  const x2 = cx + radius * Math.cos(endRad);
  const y2 = cy + radius * Math.sin(endRad);
  
  doc.moveTo(cx, cy)
     .lineTo(x1, y1)
     .arc(cx, cy, radius, startDeg - 90, endDeg - 90)
     .lineTo(cx, cy)
     .fill();
     
  doc.restore();
}

function drawPieChart(doc, x, y, radius, data, colors) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) return;
  
  let currentAngle = 0;
  
  data.forEach((item, idx) => {
    const sliceAngle = (item.value / total) * 360;
    const endAngle = currentAngle + sliceAngle;
    const color = colors[idx % colors.length];
    
    drawPieSlice(doc, x, y, radius, currentAngle, endAngle, color);
    currentAngle = endAngle;
  });
  
  // Draw Legend
  let legendY = y - radius;
  data.forEach((item, idx) => {
    const color = colors[idx % colors.length];
    doc.save();
    doc.fillColor(color);
    doc.rect(x + radius + 25, legendY, 10, 10).fill();
    doc.fillColor("#1e293b");
    doc.fontSize(8);
    const labelText = `${item.label}: ${item.value} (${((item.value / total) * 100).toFixed(0)}%)`;
    doc.text(labelText, x + radius + 42, legendY + 1);
    doc.restore();
    legendY += 16;
  });
}

function drawBarChart(doc, x, y, width, height, data, colors) {
  const maxVal = Math.max(...data.map(d => d.value), 1);
  
  // Axes
  doc.save();
  doc.strokeColor("#94a3b8").lineWidth(0.8);
  doc.moveTo(x, y).lineTo(x + width, y).stroke(); // horizontal line
  doc.restore();
  
  const barSpacingPct = 0.35;
  const barWidth = (width / data.length) * (1 - barSpacingPct);
  const barSpacing = (width / data.length) * barSpacingPct;
  
  data.forEach((item, idx) => {
    const barHeight = (item.value / maxVal) * (height * 0.82);
    const barX = x + idx * (barWidth + barSpacing) + barSpacing / 2;
    const barY = y - barHeight;
    const color = colors[idx % colors.length];
    
    doc.save();
    doc.fillColor(color);
    doc.rect(barX, barY, barWidth, barHeight).fill();
    doc.restore();
    
    // Label and Value
    doc.save();
    doc.fillColor("#1e293b").fontSize(8);
    doc.text(String(item.value), barX, barY - 10, { width: barWidth, align: "center" });
    
    // Rotate label for x-axis if text is long
    doc.fontSize(7).fillColor("#64748b");
    doc.text(item.label, barX - barSpacing / 2, y + 6, { width: barWidth + barSpacing, align: "center" });
    doc.restore();
  });
}

function drawScatterChart(doc, x, y, width, height, points, totalMarks) {
  const maxTime = Math.max(...points.map(p => p.x), 60);
  
  doc.save();
  doc.strokeColor("#e2e8f0").lineWidth(0.5);
  
  // Horizontal grid lines
  for (let i = 0; i <= 5; i++) {
    const scoreVal = Math.round((totalMarks / 5) * i);
    const lineY = y - (scoreVal / totalMarks) * height;
    doc.moveTo(x, lineY).lineTo(x + width, lineY).stroke();
    doc.fillColor("#64748b").fontSize(7).text(String(scoreVal), x - 22, lineY - 3, { width: 18, align: "right" });
  }
  
  // Vertical grid lines
  const timeStep = maxTime > 60 ? 20 : 15;
  const numSteps = Math.ceil(maxTime / timeStep);
  for (let i = 0; i <= numSteps; i++) {
    const timeVal = timeStep * i;
    const lineX = x + (timeVal / maxTime) * width;
    doc.moveTo(lineX, y).lineTo(lineX, y - height).stroke();
    doc.fillColor("#64748b").fontSize(7).text(`${timeVal}m`, lineX - 15, y + 6, { width: 30, align: "center" });
  }
  
  // Outline
  doc.strokeColor("#94a3b8").lineWidth(1);
  doc.moveTo(x, y).lineTo(x, y - height).stroke();
  doc.moveTo(x, y).lineTo(x + width, y).stroke();
  doc.restore();
  
  // Draw Dots
  points.forEach(p => {
    const ptX = x + (p.x / maxTime) * width;
    const ptY = y - (p.y / totalMarks) * height;
    
    doc.save();
    doc.fillColor("#4f46e5");
    doc.circle(ptX, ptY, 3).fill();
    
    doc.fillColor("#94a3b8").fontSize(6);
    doc.text(p.label.slice(0, 3), ptX + 5, ptY - 3);
    doc.restore();
  });
}

export async function generatePDFReport(analyticsData, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: "A4", autoFirstPage: true });
      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);
      
      const themeColors = ["#4f46e5", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"];
      
      // ----------------------------------------------------
      // PAGE 1 — COVER
      // ----------------------------------------------------
      doc.rect(0, 0, 595.28, 260).fill("#4f46e5");
      
      doc.fillColor("#ffffff").fontSize(24).font("Helvetica-Bold").text("Edtechra AI Exam Engine", 50, 80);
      doc.fontSize(16).font("Helvetica").text("Non-AI Deterministic Score Analysis Report", 50, 115);
      
      doc.fontSize(11).text(`Exam Name: ${analyticsData.exam_name}`, 50, 160);
      doc.text(`Exam ID: ${analyticsData.exam_id}   |   Class ID: ${analyticsData.class_id}`, 50, 180);
      doc.text(`Date of Report: ${new Date().toLocaleDateString()}`, 50, 200);
      
      // Summary card on cover page
      doc.rect(50, 300, 495, 200).fillColor("#f8fafc").strokeColor("#e2e8f0").lineWidth(1).fillAndStroke();
      
      doc.fillColor("#1e293b").fontSize(14).font("Helvetica-Bold").text("Report Summary Dashboard", 75, 325);
      doc.fontSize(11).font("Helvetica").fillColor("#4f46e5");
      doc.text(`Total Students Evaluated: ${analyticsData.total_students}`, 75, 360);
      doc.text(`Class Average Score: ${analyticsData.average_score} / ${analyticsData.total_marks} (${((analyticsData.average_score/analyticsData.total_marks)*100).toFixed(1)}%)`, 75, 385);
      doc.text(`Class Passing Rate: ${analyticsData.pass_rate}%`, 75, 410);
      doc.text(`Range of Scores: ${analyticsData.score_range} pts (${analyticsData.lowest_score} to ${analyticsData.highest_score})`, 75, 435);
      doc.text(`Average Time Spent: ${analyticsData.time_analysis.average_time} minutes`, 75, 460);
      
      doc.fillColor("#94a3b8").fontSize(9).text("This report is mathematically generated and reproducible. No AI logic applied.", 50, 750, { align: "center" });
      
      // ----------------------------------------------------
      // PAGE 2 — SUMMARY DASHBOARD
      // ----------------------------------------------------
      doc.addPage();
      doc.rect(0, 0, 595.28, 40).fill("#1e293b");
      doc.fillColor("#ffffff").fontSize(11).font("Helvetica-Bold").text("EXAM ANALYTICS REPORT  |  SUMMARY DASHBOARD", 50, 15);
      
      doc.fillColor("#1e293b").fontSize(18).font("Helvetica-Bold").text("Executive Class Performance Summary", 50, 65);
      
      // Draw 4 Metric cards
      const cardW = 235;
      const cardH = 90;
      
      // Metric 1: Average
      doc.rect(50, 110, cardW, cardH).fillColor("#f1f5f9").fill();
      doc.fillColor("#4f46e5").fontSize(26).font("Helvetica-Bold").text(`${analyticsData.average_score}`, 70, 130);
      doc.fillColor("#1e293b").fontSize(10).font("Helvetica-Bold").text("CLASS AVERAGE SCORE", 70, 160);
      doc.fillColor("#64748b").fontSize(8).font("Helvetica").text(`Out of ${analyticsData.total_marks} max marks`, 70, 175);
      
      // Metric 2: Pass Rate
      doc.rect(310, 110, cardW, cardH).fillColor("#f1f5f9").fill();
      doc.fillColor("#10b981").fontSize(26).font("Helvetica-Bold").text(`${analyticsData.pass_rate}%`, 330, 130);
      doc.fillColor("#1e293b").fontSize(10).font("Helvetica-Bold").text("CLASS PASS RATE", 330, 160);
      doc.fillColor("#64748b").fontSize(8).font("Helvetica").text(`${analyticsData.pass_count} passed, ${analyticsData.fail_count} failed`, 330, 175);
      
      // Metric 3: Highest / Lowest
      doc.rect(50, 220, cardW, cardH).fillColor("#f1f5f9").fill();
      doc.fillColor("#06b6d4").fontSize(24).font("Helvetica-Bold").text(`${analyticsData.highest_score} / ${analyticsData.lowest_score}`, 70, 238);
      doc.fillColor("#1e293b").fontSize(10).font("Helvetica-Bold").text("HIGHEST / LOWEST SCORES", 70, 270);
      doc.fillColor("#64748b").fontSize(8).font("Helvetica").text(`Spread of ${analyticsData.score_range} points`, 70, 285);
      
      // Metric 4: Median Score
      doc.rect(310, 220, cardW, cardH).fillColor("#f1f5f9").fill();
      doc.fillColor("#8b5cf6").fontSize(26).font("Helvetica-Bold").text(`${analyticsData.median_score}`, 330, 230);
      doc.fillColor("#1e293b").fontSize(10).font("Helvetica-Bold").text("MEDIAN STUDENT SCORE", 330, 260);
      doc.fillColor("#64748b").fontSize(8).font("Helvetica").text("50% of students scored above/below this", 330, 275);
      
      // Grade Distribution Summary table
      doc.fillColor("#1e293b").fontSize(12).font("Helvetica-Bold").text("Grade Distribution Breakdown", 50, 340);
      
      let tableY = 365;
      doc.rect(50, tableY, 495, 22).fillColor("#e2e8f0").fill();
      doc.fillColor("#1e293b").fontSize(9).font("Helvetica-Bold");
      doc.text("Grade", 70, tableY + 6);
      doc.text("Description Range", 160, tableY + 6);
      doc.text("Count", 300, tableY + 6);
      doc.text("Percentage", 420, tableY + 6);
      
      const gradesInfo = [
        { g: "A+", r: "90% - 100% of Marks", c: analyticsData.grade_distribution["A+"], p: analyticsData.grade_percentages["A+"] },
        { g: "A", r: "80% - 89% of Marks", c: analyticsData.grade_distribution["A"], p: analyticsData.grade_percentages["A"] },
        { g: "B", r: "70% - 79% of Marks", c: analyticsData.grade_distribution["B"], p: analyticsData.grade_percentages["B"] },
        { g: "C", r: "60% - 69% of Marks", c: analyticsData.grade_distribution["C"], p: analyticsData.grade_percentages["C"] },
        { g: "D", r: "50% - 59% of Marks", c: analyticsData.grade_distribution["D"], p: analyticsData.grade_percentages["D"] },
        { g: "F", r: "Below 50% (Fail)", c: analyticsData.grade_distribution["F"], p: analyticsData.grade_percentages["F"] }
      ];
      
      gradesInfo.forEach((info) => {
        tableY += 22;
        doc.rect(50, tableY, 495, 22).fillColor(info.g === "F" && info.c > 0 ? "#fef2f2" : "#ffffff").strokeColor("#f1f5f9").lineWidth(1).fillAndStroke();
        doc.fillColor(info.g === "F" && info.c > 0 ? "#ef4444" : "#1e293b").fontSize(9).font("Helvetica");
        doc.text(info.g, 70, tableY + 6);
        doc.text(info.r, 160, tableY + 6);
        doc.text(String(info.c), 300, tableY + 6);
        doc.text(`${info.p}%`, 420, tableY + 6);
      });
      
      doc.fillColor("#94a3b8").fontSize(8).text("Page 2  |  Summary Dashboard", 50, 750, { align: "right" });
      
      // ----------------------------------------------------
      // PAGE 3 — VISUAL CHARTS
      // ----------------------------------------------------
      doc.addPage();
      doc.rect(0, 0, 595.28, 40).fill("#1e293b");
      doc.fillColor("#ffffff").fontSize(11).font("Helvetica-Bold").text("EXAM ANALYTICS REPORT  |  VISUAL STATISTICS", 50, 15);
      
      // Chart 1: Grade Distribution (Pie)
      doc.fillColor("#1e293b").fontSize(11).font("Helvetica-Bold").text("1. Grade Distribution (Pie)", 50, 60);
      const pieData = Object.keys(analyticsData.grade_distribution).map(key => ({
        label: key,
        value: analyticsData.grade_distribution[key]
      }));
      drawPieChart(doc, 140, 150, 55, pieData, themeColors);
      
      // Chart 2: Score Distribution (Bar)
      doc.fillColor("#1e293b").fontSize(11).font("Helvetica-Bold").text("2. Score Frequency Distribution (Bar)", 50, 240);
      const scoreDistData = [
        { label: "0-49", value: analyticsData.grade_distribution["F"] },
        { label: "50-59", value: analyticsData.grade_distribution["D"] },
        { label: "60-69", value: analyticsData.grade_distribution["C"] },
        { label: "70-79", value: analyticsData.grade_distribution["B"] },
        { label: "80-89", value: analyticsData.grade_distribution["A"] },
        { label: "90-100", value: analyticsData.grade_distribution["A+"] }
      ];
      drawBarChart(doc, 70, 385, 450, 110, scoreDistData, ["#4f46e5"]);
      
      // Chart 5: Time vs Score (Scatter)
      doc.fillColor("#1e293b").fontSize(11).font("Helvetica-Bold").text("3. Duration vs Score Correlation (Scatter)", 50, 440);
      const scatterPoints = analyticsData.students.map(s => ({
        x: s.time_taken_minutes,
        y: s.score,
        label: s.name
      }));
      drawScatterChart(doc, 85, 590, 430, 115, scatterPoints, analyticsData.total_marks);
      
      doc.fillColor("#94a3b8").fontSize(8).text("Page 3  |  Visual Statistics", 50, 750, { align: "right" });
      
      // ----------------------------------------------------
      // PAGE 4 — QUESTION ANALYSIS
      // ----------------------------------------------------
      doc.addPage();
      doc.rect(0, 0, 595.28, 40).fill("#1e293b");
      doc.fillColor("#ffffff").fontSize(11).font("Helvetica-Bold").text("EXAM ANALYTICS REPORT  |  QUESTION ANALYSIS", 50, 15);
      
      doc.fillColor("#1e293b").fontSize(14).font("Helvetica-Bold").text("Item Response Analysis Table", 50, 65);
      
      // Display easiest / hardest question
      if (analyticsData.easiest_question && analyticsData.hardest_question) {
        doc.rect(50, 95, 235, 55).fillColor("#ecfdf5").strokeColor("#10b981").lineWidth(0.5).fillAndStroke();
        doc.fillColor("#065f46").fontSize(8).font("Helvetica-Bold").text("EASIEST QUESTION", 60, 105);
        doc.fillColor("#1e293b").fontSize(9).font("Helvetica-Bold").text(`ID: ${analyticsData.easiest_question.question_id} (${analyticsData.easiest_question.topic})`, 60, 118);
        doc.font("Helvetica").fontSize(8).text(`Accuracy: ${analyticsData.easiest_question.correct_rate}%`, 60, 131);
        
        doc.rect(310, 95, 235, 55).fillColor("#fef2f2").strokeColor("#ef4444").lineWidth(0.5).fillAndStroke();
        doc.fillColor("#991b1b").fontSize(8).font("Helvetica-Bold").text("HARDEST QUESTION (REVISE)", 320, 105);
        doc.fillColor("#1e293b").fontSize(9).font("Helvetica-Bold").text(`ID: ${analyticsData.hardest_question.question_id} (${analyticsData.hardest_question.topic})`, 320, 118);
        doc.font("Helvetica").fontSize(8).text(`Accuracy: ${analyticsData.hardest_question.correct_rate}%`, 320, 131);
      }
      
      // Question Table
      tableY = 175;
      doc.rect(50, tableY, 495, 20).fillColor("#e2e8f0").fill();
      doc.fillColor("#1e293b").fontSize(8).font("Helvetica-Bold");
      doc.text("QID", 60, tableY + 5);
      doc.text("Topic", 110, tableY + 5);
      doc.text("Difficulty", 220, tableY + 5);
      doc.text("Correct Attempts", 320, tableY + 5);
      doc.text("Incorrect", 420, tableY + 5);
      doc.text("Accuracy", 485, tableY + 5);
      
      analyticsData.question_analysis.slice(0, 20).forEach(q => {
        tableY += 20;
        const isHard = q.correct_rate < 50;
        const rowBg = isHard ? "#fef2f2" : "#ffffff";
        
        doc.rect(50, tableY, 495, 20).fillColor(rowBg).strokeColor("#f1f5f9").lineWidth(0.5).fillAndStroke();
        doc.fillColor(isHard ? "#991b1b" : "#1e293b").fontSize(8).font("Helvetica");
        
        doc.text(q.question_id, 60, tableY + 5);
        doc.text(q.topic, 110, tableY + 5, { width: 100, height: 12, ellipsis: true });
        doc.text(q.difficulty, 220, tableY + 5);
        doc.text(String(q.correct_attempts), 320, tableY + 5);
        doc.text(String(q.incorrect_attempts), 420, tableY + 5);
        doc.text(`${q.correct_rate}%`, 485, tableY + 5);
      });
      
      doc.fillColor("#94a3b8").fontSize(8).text("Page 4  |  Question Analysis", 50, 750, { align: "right" });
      
      // ----------------------------------------------------
      // PAGE 5 — TOPIC & DIFFICULTY INSIGHTS
      // ----------------------------------------------------
      doc.addPage();
      doc.rect(0, 0, 595.28, 40).fill("#1e293b");
      doc.fillColor("#ffffff").fontSize(11).font("Helvetica-Bold").text("EXAM ANALYTICS REPORT  |  TOPICAL INSIGHTS", 50, 15);
      
      doc.fillColor("#1e293b").fontSize(14).font("Helvetica-Bold").text("Topic Performance Breakdown", 50, 65);
      
      // Highlight strongest/weakest topics
      if (analyticsData.strongest_topic && analyticsData.weakest_topic) {
        doc.rect(50, 90, 235, 55).fillColor("#ecfdf5").strokeColor("#10b981").lineWidth(0.5).fillAndStroke();
        doc.fillColor("#065f46").fontSize(8).font("Helvetica-Bold").text("STRONGEST SUBJECT TOPIC", 60, 100);
        doc.fillColor("#1e293b").fontSize(9).font("Helvetica-Bold").text(analyticsData.strongest_topic.topic, 60, 113);
        doc.font("Helvetica").fontSize(8).text(`Overall Accuracy: ${analyticsData.strongest_topic.accuracy}%`, 60, 126);
        
        doc.rect(310, 90, 235, 55).fillColor("#fef2f2").strokeColor("#ef4444").lineWidth(0.5).fillAndStroke();
        doc.fillColor("#991b1b").fontSize(8).font("Helvetica-Bold").text("WEAKEST TOPIC (NEED ATTENTION)", 320, 100);
        doc.fillColor("#1e293b").fontSize(9).font("Helvetica-Bold").text(analyticsData.weakest_topic.topic, 320, 113);
        doc.font("Helvetica").fontSize(8).text(`Overall Accuracy: ${analyticsData.weakest_topic.accuracy}%`, 320, 126);
      }
      
      // Topic Table
      tableY = 165;
      doc.rect(50, tableY, 495, 20).fillColor("#e2e8f0").fill();
      doc.fillColor("#1e293b").fontSize(9).font("Helvetica-Bold");
      doc.text("Topic Name", 70, tableY + 5);
      doc.text("Total Questions", 250, tableY + 5);
      doc.text("Accuracy Rate", 400, tableY + 5);
      
      analyticsData.topic_performance.forEach(topic => {
        tableY += 22;
        const isLow = topic.accuracy < 50;
        doc.rect(50, tableY, 495, 22).fillColor(isLow ? "#fef2f2" : "#ffffff").strokeColor("#f1f5f9").lineWidth(0.5).fillAndStroke();
        doc.fillColor(isLow ? "#ef4444" : "#1e293b").fontSize(8).font("Helvetica");
        doc.text(topic.topic, 70, tableY + 6);
        doc.text(String(topic.total_questions), 250, tableY + 6);
        doc.text(`${topic.accuracy}%`, 400, tableY + 6);
      });
      
      // Difficulty Breakdown Table
      doc.fillColor("#1e293b").fontSize(12).font("Helvetica-Bold").text("Difficulty Level Breakdown", 50, tableY + 50);
      
      tableY += 75;
      doc.rect(50, tableY, 495, 20).fillColor("#e2e8f0").fill();
      doc.fillColor("#1e293b").fontSize(9).font("Helvetica-Bold");
      doc.text("Difficulty", 70, tableY + 5);
      doc.text("Accuracy (Success Rate)", 250, tableY + 5);
      doc.text("Failure Rate", 400, tableY + 5);
      
      analyticsData.difficulty_analysis.forEach(diff => {
        tableY += 22;
        doc.rect(50, tableY, 495, 22).fillColor("#ffffff").strokeColor("#f1f5f9").lineWidth(0.5).fillAndStroke();
        doc.fillColor("#1e293b").fontSize(8).font("Helvetica");
        doc.text(diff.difficulty, 70, tableY + 6);
        doc.text(`${diff.accuracy}%`, 250, tableY + 6);
        doc.text(`${diff.failure_rate}%`, 400, tableY + 6);
      });
      
      doc.fillColor("#94a3b8").fontSize(8).text("Page 5  |  Topical Insights", 50, 750, { align: "right" });
      
      // ----------------------------------------------------
      // PAGE 6 — STUDENT PERFORMANCE TABLE
      // ----------------------------------------------------
      doc.addPage();
      doc.rect(0, 0, 595.28, 40).fill("#1e293b");
      doc.fillColor("#ffffff").fontSize(11).font("Helvetica-Bold").text("EXAM ANALYTICS REPORT  |  STUDENT RANKINGS", 50, 15);
      
      doc.fillColor("#1e293b").fontSize(14).font("Helvetica-Bold").text("Student Rankings and Performance Leaderboard", 50, 65);
      
      tableY = 95;
      doc.rect(50, tableY, 495, 20).fillColor("#e2e8f0").fill();
      doc.fillColor("#1e293b").fontSize(8).font("Helvetica-Bold");
      doc.text("Rank", 60, tableY + 5);
      doc.text("Student Name", 100, tableY + 5);
      doc.text("Score", 220, tableY + 5);
      doc.text("Grade", 290, tableY + 5);
      doc.text("Percentile", 350, tableY + 5);
      doc.text("Duration", 430, tableY + 5);
      doc.text("Status", 495, tableY + 5);
      
      analyticsData.students.slice(0, 26).forEach(s => {
        tableY += 20;
        const failed = s.grade === "F";
        const rowBg = failed ? "#fef2f2" : "#ffffff";
        
        doc.rect(50, tableY, 495, 20).fillColor(rowBg).strokeColor("#f1f5f9").lineWidth(0.5).fillAndStroke();
        doc.fillColor(failed ? "#ef4444" : "#1e293b").fontSize(8).font("Helvetica");
        
        doc.text(String(s.rank), 60, tableY + 5);
        doc.text(s.name, 100, tableY + 5, { width: 110, height: 12, ellipsis: true });
        doc.text(`${s.score} / ${analyticsData.total_marks}`, 220, tableY + 5);
        doc.text(s.grade, 290, tableY + 5);
        doc.text(`${s.percentile}%`, 350, tableY + 5);
        doc.text(`${s.time_taken_minutes}m`, 430, tableY + 5);
        doc.text(failed ? "Failed" : "Passed", 495, tableY + 5);
      });
      
      doc.fillColor("#94a3b8").fontSize(8).text("Page 6  |  Student Performance Table", 50, 750, { align: "right" });
      
      // ----------------------------------------------------
      // PAGE 7 — INSIGHTS (RULE ENGINE ONLY)
      // ----------------------------------------------------
      doc.addPage();
      doc.rect(0, 0, 595.28, 40).fill("#1e293b");
      doc.fillColor("#ffffff").fontSize(11).font("Helvetica-Bold").text("EXAM ANALYTICS REPORT  |  DETERMINISTIC INSIGHTS", 50, 15);
      
      doc.fillColor("#1e293b").fontSize(14).font("Helvetica-Bold").text("Rule-Based Class Analytics and Recommendations", 50, 65);
      
      const insights = computeInsights(analyticsData);
      
      let insightY = 100;
      insights.forEach(insight => {
        let boxColor = "#f8fafc";
        let borderColor = "#cbd5e1";
        let textColor = "#1e293b";
        let labelColor = "#475569";
        
        if (insight.type === "success") {
          boxColor = "#f0fdf4";
          borderColor = "#86efac";
          textColor = "#14532d";
          labelColor = "#15803d";
        } else if (insight.type === "danger") {
          boxColor = "#fef2f2";
          borderColor = "#fca5a5";
          textColor = "#7f1d1d";
          labelColor = "#b91c1c";
        } else if (insight.type === "warning") {
          boxColor = "#fffbeb";
          borderColor = "#fde047";
          textColor = "#78350f";
          labelColor = "#b45309";
        } else if (insight.type === "info") {
          boxColor = "#f0f9ff";
          borderColor = "#7dd3fc";
          textColor = "#0c4a6e";
          labelColor = "#0369a1";
        }
        
        doc.rect(50, insightY, 495, 65).fillColor(boxColor).strokeColor(borderColor).lineWidth(0.8).fillAndStroke();
        
        doc.fillColor(labelColor).fontSize(10).font("Helvetica-Bold").text(insight.title.toUpperCase(), 70, insightY + 12);
        doc.fillColor(textColor).fontSize(9).font("Helvetica").text(insight.text, 70, insightY + 28, { width: 450 });
        
        insightY += 80;
      });
      
      // Outlier identification summary
      doc.fillColor("#1e293b").fontSize(12).font("Helvetica-Bold").text("Statistical Outliers Summary", 50, insightY + 10);
      insightY += 30;
      
      doc.rect(50, insightY, 495, 120).fillColor("#f8fafc").strokeColor("#e2e8f0").lineWidth(1).fillAndStroke();
      
      doc.fillColor("#1e293b").fontSize(9).font("Helvetica-Bold");
      doc.text("Top Performers (Top 10% Percentile):", 65, insightY + 15);
      doc.text("Low Performers (Bottom 10% Percentile):", 65, insightY + 50);
      doc.text("At-Risk (Failed + Higher-than-Avg Time):", 65, insightY + 85);
      
      const topNames = analyticsData.outliers.top_performers.map(s => `${s.name} (${s.score} pts)`).join(", ") || "None identified";
      const lowNames = analyticsData.outliers.low_performers.map(s => `${s.name} (${s.score} pts)`).join(", ") || "None identified";
      const atRiskNames = analyticsData.outliers.at_risk.map(s => `${s.name} (${s.time} mins)`).join(", ") || "None identified";
      
      doc.font("Helvetica").fontSize(8.5).fillColor("#475569");
      doc.text(topNames, 65, insightY + 28, { width: 460 });
      doc.text(lowNames, 65, insightY + 63, { width: 460 });
      doc.text(atRiskNames, 65, insightY + 98, { width: 460 });
      
      doc.fillColor("#94a3b8").fontSize(8).text("Page 7  |  Deterministic Insights", 50, 750, { align: "right" });
      
      doc.end();
      
      stream.on("finish", () => {
        resolve();
      });
      
      stream.on("error", (err) => {
        reject(err);
      });
    } catch (e) {
      reject(e);
    }
  });
}
