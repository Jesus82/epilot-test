<script setup lang="ts">
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  type ChartOptions,
} from 'chart.js'
import 'chartjs-adapter-date-fns'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
)

const { priceHistory, averagePrice, bidPrice } = useBtcPrice()

const isMounted = ref(false)

const chartData = computed(() => {
  const datasets: any[] = [
    {
      label: 'BTC Price (USD)',
      data: priceHistory.value.map(d => d.price),
      borderColor: '#f7931a',
      backgroundColor: 'rgba(247, 147, 26, 0.1)',
      tension: 0.4,
      pointRadius: 0,
      borderWidth: 2,
    },
  ]
  
  // Add average line
  if (averagePrice.value && priceHistory.value.length > 0) {
    datasets.push({
      label: 'Average',
      data: priceHistory.value.map(() => averagePrice.value),
      borderColor: '#10b981',
      borderWidth: 2,
      borderDash: [5, 5],
      pointRadius: 0,
      fill: false,
    })
  }
  
  // Add bid line
  if (bidPrice.value && priceHistory.value.length > 0) {
    datasets.push({
      label: 'Bid',
      data: priceHistory.value.map(() => bidPrice.value),
      borderColor: '#f59e0b',
      borderWidth: 2,
      borderDash: [3, 3],
      pointRadius: 0,
      fill: false,
    })
  }
  
  return {
    labels: priceHistory.value.map(d => new Date(d.timestamp)),
    datasets,
  }
})

const chartOptions: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: true,
      position: 'top',
    },
    tooltip: {
      mode: 'index',
      intersect: false,
    },
  },
  scales: {
    x: {
      type: 'time',
      time: {
        displayFormats: {
          second: 'HH:mm:ss',
        },
      },
      title: {
        display: true,
        text: 'Time',
      },
    },
    y: {
      title: {
        display: true,
        text: 'Price (USD)',
      },
      ticks: {
        callback: function(value: string | number) {
          return '$' + Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        },
      },
    },
  },
  interaction: {
    mode: 'nearest',
    axis: 'x',
    intersect: false,
  },
}

onMounted(() => {
  isMounted.value = true
})
</script>

<template>
  <div v-if="isMounted" class="btc-chart">
    <h2>Chart.js</h2>
    <p>Data points: {{ priceHistory.length }}</p>
    <div class="chart-container">
      <Line :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>

<style scoped>
.btc-chart {
  margin: 20px 0;
}

.chart-container {
  width: 100%;
  height: 300px;
  background: #f9f9f9;
  border: 1px solid #ddd;
  padding: 10px;
}
</style>
