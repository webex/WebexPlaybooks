import { wallboardRangeLegendLabelForDays } from "./wallboardConfig.js";

let checkToken = async () => {
  try {
    const results = await fetch("http://localhost:3000/checkToken");
  } catch (error) {
    console.log(error);
  }
};

let fetchData = async () => {
  try {
    const results = await fetch("http://localhost:3000/callCountByEntryPoint");
    return await results.json();
  } catch (error) {
    console.log(error);
  }
};

const ctx = document.getElementById("callCountByEntryPoint");

export const callCountByEntryPoint = new Chart(ctx, {
  type: "bar",
  data: {
    // labels: [],
    datasets: [
      {
        label: "Totals over the past 7 days",
        // data: [1],
        backgroundColor: ["rgba(93,205,205,1)"],
        hoverOffset: 4,
        borderColor: ["rgba(93,205,205,1)"]
      }
    ]
  },
  options: {
    responsive: true,
    aspectRatio: 1,
    layout: {
      padding: {
        left: 10,
        right: 30,
        top: 0,
        bottom: 10
      }
    },
    plugins: {
      labels: {
        render: "value",
        fontColor: [],
        fontSize: 12,
        fontStyle: "bolder",
        textMargin: 1,
        position: "border"
      },
      legend: {
        display: true,
        position: "bottom",
        labels: {
          color: "#FED87C",
          font: {
            size: 12
          }
        }
      },
      title: {
        display: true,
        text: "Call Count By EntryPoint",
        color: "white",
        font: {
          size: 16
        },
        padding: {
          top: 10,
          bottom: 20
        }
      }
    },
    scales: {
      y: {
        ticks: {
          color: "white",
          font: {
            size: 12
          }
        },
        grid: {
          color: "white"
        }
      },
      x: {
        ticks: {
          color: "white",
          font: {
            size: 12
          }
        },
        grid: {
          color: "white"
        }
      }
    }
  }
});

async function updateChart() {
  try {
    const payload = await fetchData();
    if (!payload?.data) {
      return;
    }
    const { data: arrFromQuery, wallboard_lookback_days: lookbackDays } = payload;
    callCountByEntryPoint.data.datasets[0].label =
      wallboardRangeLegendLabelForDays(lookbackDays);
    const epName = arrFromQuery.map(name => {
      return name.lastEntryPoint?.name ?? "Unknown";
    });
    const epTotal = arrFromQuery.map(value => {
      return value.aggregation[0].value;
    });
    const epFontColor = arrFromQuery.map(() => {
      return "rgba(254,216,124,1)";
    });
    if (callCountByEntryPoint.data.datasets[0].data.length > 0) {
      callCountByEntryPoint.data.labels.length = 0;
      callCountByEntryPoint.data.datasets[0].data.length = 0;
    }
    callCountByEntryPoint.data.labels.push(...epName);
    callCountByEntryPoint.data.datasets[0].data.push(...epTotal);
    callCountByEntryPoint.options.plugins.labels.fontColor = epFontColor;
    callCountByEntryPoint.update();
  } catch (error) {
    // console.log(`a bit of a hic-up`);
  }
}

document.addEventListener("DOMContentLoaded", function (e) {
  setTimeout(() => {
    setInterval(async () => {
      updateChart();
    }, 5000);
  }, 5000);
  checkToken();
});
