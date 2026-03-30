import { wallboardRangeLegendLabelForDays } from "./wallboardConfig.js";

let fetchData = async () => {
  try {
    const results = await fetch("http://localhost:3000/callStatsByQueue");
    return await results.json();
  } catch (error) {
    console.log(error);
  }
};

const ctx = document.getElementById("callStatsByQueue");

export const callStatsByQueue = new Chart(ctx, {
  type: "doughnut",
  data: {
    // labels: [],
    datasets: [
      {
        label: "Totals over the past 7 days",
        data: [],
        backgroundColor: ["rgba(243,130,157,1)", "rgba(93,205,205,1)", "rgba(94,180,239,1)", "rgba(247,216,123,1)", "rgba(163,91,109,1)", "rgba(64,137,137,1)", "rgba(61,114,151,1)", "rgba(77,162,235,1)"],
        hoverOffset: 4,
        borderColor: ["rgba(243,130,157,1)", "rgba(93,205,205,1)", "rgba(94,180,239,1)", "rgba(247,216,123,1)", "rgba(163,91,109,1)", "rgba(64,137,137,1)", "rgba(61,114,151,1)", "rgba(77,162,235,1)"]
      }
    ]
  },
  options: {
    responsive: true,
    layout: {
      padding: {
        left: 0,
        right: 0,
        top: 0,
        bottom: 0
      }
    },
    plugins: {
      labels: {
        render: function (args) {
          // use to modify
          let num = args;
          return num.value;
        },
        fontColor: [],
        fontSize: 14,
        fontStyle: "bolder",
        // textMargin: 9,
        position: "border"
      },
      legend: {
        // display: false,
        position: "bottom",
        labels: {
          boxWidth: 2,
          color: "white",
          font: {
            size: 12
          }
        }
      },
      title: {
        display: true,
        text: "Queue Count",
        color: "white",
        font: {
          size: 16
        },
        padding: {
          top: 10,
          bottom: 20
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
    callStatsByQueue.data.datasets[0].label =
      wallboardRangeLegendLabelForDays(lookbackDays);

    const queueName = arrFromQuery.map(name => {
      return name.lastQueue?.name ?? "Unknown";
    });
    const queueTotal = arrFromQuery.map(value => {
      return value.aggregation[0].value;
    });
    const epFontColor = arrFromQuery.map(() => {
      return "rgba(255,255,255,1)";
    });

    if (callStatsByQueue.data.datasets[0].data.length > 0) {
      callStatsByQueue.data.labels.length = 0;
      callStatsByQueue.data.datasets[0].data.length = 0;
    }

    callStatsByQueue.data.labels.push(...queueName);
    callStatsByQueue.data.datasets[0].data.push(...queueTotal);
    callStatsByQueue.options.plugins.labels.fontColor = epFontColor;
    callStatsByQueue.update();
  } catch (error) {
    // console.log(`a bit of a hic-up`);
  }
}

document.addEventListener("DOMContentLoaded", function (e) {
  setTimeout(() => {
    setInterval(async () => {
      updateChart();
    }, 5000);
  }, 3000);

  // updateChart();
});
