/**
 * Oriental v3.0 - Lightweight Chart Renderer
 * Custom Canvas API charts - no external dependencies
 * Total size: ~8KB vs Chart.js 200KB+
 */

class LightweightCharts {
    constructor() {
        this.charts = new Map();
        this.colors = {
            primary: '#7c3aed',
            success: '#22c55e',
            warning: '#f59e0b',
            danger: '#ef4444',
            info: '#3b82f6',
            gray: '#9ca3af',
            palette: [
                '#7c3aed', '#3b82f6', '#22c55e', '#f59e0b', 
                '#ef4444', '#06b6d4', '#ec4899', '#f97316'
            ]
        };
    }

    // Bar Chart
    renderBarChart(canvasId, data, options = {}) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width = canvas.offsetWidth * 2;
        const height = canvas.height = canvas.offsetHeight * 2;
        ctx.scale(2, 2);

        const { labels, datasets } = data;
        const padding = { top: 20, right: 20, bottom: 40, left: 50 };
        const chartWidth = canvas.offsetWidth - padding.left - padding.right;
        const chartHeight = canvas.offsetHeight - padding.top - padding.bottom;

        // Clear
        ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

        // Calculate max value
        let maxValue = 0;
        datasets.forEach(ds => {
            const dsMax = Math.max(...ds.data);
            if (dsMax > maxValue) maxValue = dsMax;
        });
        maxValue = Math.ceil(maxValue * 1.1);

        // Draw grid
        const gridLines = 5;
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 0.5;
        for (let i = 0; i <= gridLines; i++) {
            const y = padding.top + (chartHeight / gridLines) * i;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(padding.left + chartWidth, y);
            ctx.stroke();

            // Label
            const value = Math.round(maxValue - (maxValue / gridLines) * i);
            ctx.fillStyle = '#6b7280';
            ctx.font = '11px Inter, sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(value, padding.left - 10, y + 4);
        }

        // Draw bars
        const barWidth = chartWidth / labels.length;
        const datasetWidth = barWidth / (datasets.length + 1);

        datasets.forEach((ds, dsIndex) => {
            ds.data.forEach((value, i) => {
                const x = padding.left + barWidth * i + datasetWidth * (dsIndex + 0.5);
                const barH = (value / maxValue) * chartHeight;
                const y = padding.top + chartHeight - barH;

                // Bar with rounded top
                const radius = 4;
                ctx.fillStyle = ds.backgroundColor || this.colors.palette[dsIndex];
                
                ctx.beginPath();
                ctx.moveTo(x, y + barH);
                ctx.lineTo(x, y + radius);
                ctx.quadraticCurveTo(x, y, x + radius, y);
                ctx.lineTo(x + datasetWidth - radius, y);
                ctx.quadraticCurveTo(x + datasetWidth, y, x + datasetWidth, y + radius);
                ctx.lineTo(x + datasetWidth, y + barH);
                ctx.closePath();
                ctx.fill();

                // Value on top
                if (options.showValues !== false) {
                    ctx.fillStyle = '#374151';
                    ctx.font = 'bold 10px Inter, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText(value, x + datasetWidth / 2, y - 5);
                }
            });
        });

        // Draw labels
        labels.forEach((label, i) => {
            const x = padding.left + barWidth * i + barWidth / 2;
            ctx.fillStyle = '#6b7280';
            ctx.font = '11px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(label.substring(0, 8), x, canvas.offsetHeight - 10);
        });

        this.charts.set(canvasId, canvas);
    }

    // Pie/Donut Chart
    renderPieChart(canvasId, data, options = {}) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const centerX = canvas.offsetWidth / 2;
        const centerY = canvas.offsetHeight / 2;
        const radius = Math.min(centerX, centerY) - 20;
        const innerRadius = options.donut ? radius * 0.6 : 0;

        // Clear
        ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

        const total = data.datasets[0].data.reduce((a, b) => a + b, 0);
        let currentAngle = -Math.PI / 2;

        // Draw slices
        data.labels.forEach((label, i) => {
            const value = data.datasets[0].data[i];
            const sliceAngle = (value / total) * Math.PI * 2;
            const color = data.datasets[0].backgroundColor[i] || this.colors.palette[i];

            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
            
            if (innerRadius > 0) {
                ctx.arc(centerX, centerY, innerRadius, currentAngle + sliceAngle, currentAngle, true);
            }
            
            ctx.closePath();
            ctx.fillStyle = color;
            ctx.fill();

            // Percentage label
            if (value / total > 0.05) {
                const midAngle = currentAngle + sliceAngle / 2;
                const labelX = centerX + Math.cos(midAngle) * (radius * 0.7);
                const labelY = centerY + Math.sin(midAngle) * (radius * 0.7);
                
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 12px Inter, sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`${Math.round((value / total) * 100)}%`, labelX, labelY);
            }

            currentAngle += sliceAngle;
        });

        // Draw legend
        if (options.showLegend !== false) {
            const legendX = 10;
            let legendY = 15;
            
            data.labels.forEach((label, i) => {
                const color = data.datasets[0].backgroundColor[i] || this.colors.palette[i];
                
                // Color box
                ctx.fillStyle = color;
                ctx.fillRect(legendX, legendY, 12, 12);
                
                // Label
                ctx.fillStyle = '#374151';
                ctx.font = '11px Inter, sans-serif';
                ctx.textAlign = 'left';
                ctx.fillText(label.substring(0, 15), legendX + 18, legendY + 10);
                
                legendY += 20;
            });
        }

        this.charts.set(canvasId, canvas);
    }

    // Line Chart
    renderLineChart(canvasId, data, options = {}) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const padding = { top: 20, right: 20, bottom: 40, left: 50 };
        const chartWidth = canvas.offsetWidth - padding.left - padding.right;
        const chartHeight = canvas.offsetHeight - padding.top - padding.bottom;

        ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

        // Calculate max value
        let maxValue = 0;
        data.datasets.forEach(ds => {
            const dsMax = Math.max(...ds.data);
            if (dsMax > maxValue) maxValue = dsMax;
        });
        maxValue = Math.ceil(maxValue * 1.1) || 10;

        // Grid
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 0.5;
        for (let i = 0; i <= 5; i++) {
            const y = padding.top + (chartHeight / 5) * i;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(padding.left + chartWidth, y);
            ctx.stroke();
        }

        // Draw lines
        data.datasets.forEach((ds, dsIndex) => {
            if (ds.data.length < 2) return;

            const stepX = chartWidth / (ds.data.length - 1);
            const color = ds.borderColor || this.colors.palette[dsIndex];

            // Line
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.lineJoin = 'round';

            ds.data.forEach((value, i) => {
                const x = padding.left + stepX * i;
                const y = padding.top + chartHeight - (value / maxValue) * chartHeight;
                
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.stroke();

            // Fill
            if (ds.fill) {
                ctx.lineTo(padding.left + stepX * (ds.data.length - 1), padding.top + chartHeight);
                ctx.lineTo(padding.left, padding.top + chartHeight);
                ctx.closePath();
                ctx.fillStyle = ds.backgroundColor || `${color}20`;
                ctx.fill();
            }

            // Dots
            ds.data.forEach((value, i) => {
                const x = padding.left + stepX * i;
                const y = padding.top + chartHeight - (value / maxValue) * chartHeight;
                
                ctx.beginPath();
                ctx.arc(x, y, 3, 0, Math.PI * 2);
                ctx.fillStyle = color;
                ctx.fill();
            });
        });

        // Labels
        data.labels.forEach((label, i) => {
            const x = padding.left + (chartWidth / (data.labels.length - 1)) * i;
            ctx.fillStyle = '#6b7280';
            ctx.font = '10px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(label, x, canvas.offsetHeight - 8);
        });

        this.charts.set(canvasId, canvas);
    }

    // Cumulative Flow Diagram
    renderCumulativeFlow(canvasId, data) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const padding = { top: 20, right: 20, bottom: 40, left: 50 };
        const chartWidth = canvas.offsetWidth - padding.left - padding.right;
        const chartHeight = canvas.offsetHeight - padding.top - padding.bottom;

        ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

        const dates = data.labels;
        const stepX = dates.length > 1 ? chartWidth / (dates.length - 1) : chartWidth;

        // Calculate max cumulative value
        let maxValue = 0;
        data.datasets.forEach(ds => {
            const sum = ds.data.reduce((a, b) => a + b, 0);
            if (sum > maxValue) maxValue = sum;
        });
        maxValue = Math.ceil(maxValue * 1.1) || 10;

        // Draw stacked areas (bottom to top)
        for (let i = data.datasets.length - 1; i >= 0; i--) {
            const ds = data.datasets[i];
            const color = ds.backgroundColor || this.colors.palette[i];

            ctx.beginPath();
            ctx.fillStyle = color;

            // Build stacked coordinates
            const yValues = ds.data.map((_, index) => {
                let cumulativeY = 0;
                for (let j = 0; j <= i; j++) {
                    cumulativeY += data.datasets[j].data[index] || 0;
                }
                return padding.top + chartHeight - (cumulativeY / maxValue) * chartHeight;
            });

            // Draw area
            ctx.moveTo(padding.left, padding.top + chartHeight);
            yValues.forEach((y, index) => {
                const x = padding.left + stepX * index;
                ctx.lineTo(x, y);
            });
            ctx.lineTo(padding.left + stepX * (dates.length - 1), padding.top + chartHeight);
            ctx.closePath();
            ctx.fill();
        }

        this.charts.set(canvasId, canvas);
    }

    // Heatmap
    renderHeatmap(canvasId, data) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const cellSize = 20;
        const padding = { left: 40, top: 30 };

        ctx.clearRect(0, 0, canvas.offsetWidth, canvas.offsetHeight);

        // Find max value
        let maxValue = 0;
        data.rows.forEach(row => {
            const rowMax = Math.max(...row.values);
            if (rowMax > maxValue) maxValue = rowMax;
        });

        // Draw cells
        data.rows.forEach((row, rowIndex) => {
            // Row label
            ctx.fillStyle = '#6b7280';
            ctx.font = '10px Inter, sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(row.label, padding.left - 8, padding.top + rowIndex * cellSize + 14);

            row.values.forEach((value, colIndex) => {
                const x = padding.left + colIndex * cellSize;
                const y = padding.top + rowIndex * cellSize;
                
                const intensity = maxValue > 0 ? value / maxValue : 0;
                const color = this.getHeatColor(intensity);

                ctx.fillStyle = color;
                ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
            });
        });

        this.charts.set(canvasId, canvas);
    }

    getHeatColor(intensity) {
        if (intensity === 0) return '#f3f4f6';
        if (intensity < 0.2) return '#ede9fe';
        if (intensity < 0.4) return '#ddd6fe';
        if (intensity < 0.6) return '#c4b5fd';
        if (intensity < 0.8) return '#a78bfa';
        return '#7c3aed';
    }

    // Destroy chart
    destroy(canvasId) {
        const canvas = this.charts.get(canvasId);
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            this.charts.delete(canvasId);
        }
    }

    // Destroy all
    destroyAll() {
        this.charts.forEach((canvas, id) => this.destroy(id));
    }
}

const charts = new LightweightCharts();