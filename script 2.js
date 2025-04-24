let processes = [];

function generateInputs() {
  const count = parseInt(document.getElementById('processCount').value);
  const form = document.getElementById('multiProcessForm');
  form.innerHTML = '';
  for (let i = 0; i < count; i++) {
    form.innerHTML += `
      <div class="input-set">
        <input type="text" placeholder="PID" required class="pid">
        <input type="number" placeholder="Arrival" required class="arrival">
        <input type="number" placeholder="Burst" required class="burst">
        <input type="number" placeholder="Priority (opt)" class="priority">
      </div>`;
  }
  form.classList.remove("hidden");
  document.getElementById('submitProcesses').classList.remove("hidden");
}

function submitProcesses() {
  processes = [];
  const pids = document.querySelectorAll('.pid');
  const arrivals = document.querySelectorAll('.arrival');
  const bursts = document.querySelectorAll('.burst');
  const priorities = document.querySelectorAll('.priority');
  for (let i = 0; i < pids.length; i++) {
    processes.push({
      pid: pids[i].value,
      arrival: parseInt(arrivals[i].value),
      burst: parseInt(bursts[i].value),
      priority: parseInt(priorities[i].value) || 0
    });
  }
  alert("Processes submitted!");
}

document.getElementById('algorithm').addEventListener('change', function() {
  document.getElementById('quantumField').style.display = this.value === 'rr' ? 'block' : 'none';
});

function runScheduler() {
  const algorithm = document.getElementById('algorithm').value;
  const quantum = parseInt(document.getElementById('quantum').value);
  let scheduled = [];

  switch(algorithm) {
    case 'fcfs': scheduled = fcfs(processes); break;
    case 'sjf': scheduled = sjf(processes); break;
    case 'priority': scheduled = priorityScheduling(processes); break;
    case 'rr': scheduled = roundRobin(processes, quantum); break;
    case 'srtf': scheduled = srtf(processes); break;
  }

  drawGanttChart(scheduled);
  showResults(scheduled);
}

function fcfs(pList) {
  let time = 0, result = [];
  let plist = [...pList].sort((a, b) => a.arrival - b.arrival);
  plist.forEach(p => {
    if (time < p.arrival) time = p.arrival;
    result.push({ ...p, start: time, completion: time + p.burst });
    time += p.burst;
  });
  return result;
}

function sjf(pList) {
  let time = 0, result = [], ready = [], remaining = [...pList];
  while (remaining.length > 0 || ready.length > 0) {
    ready.push(...remaining.filter(p => p.arrival <= time));
    remaining = remaining.filter(p => p.arrival > time);
    if (ready.length === 0) {
      time++;
      continue;
    }
    ready.sort((a, b) => a.burst - b.burst);
    const job = ready.shift();
    result.push({ ...job, start: time, completion: time + job.burst });
    time += job.burst;
  }
  return result;
}

function priorityScheduling(pList) {
  let time = 0, result = [], ready = [], remaining = [...pList];
  while (remaining.length > 0 || ready.length > 0) {
    ready.push(...remaining.filter(p => p.arrival <= time));
    remaining = remaining.filter(p => p.arrival > time);
    if (ready.length === 0) {
      time++;
      continue;
    }
    ready.sort((a, b) => a.priority - b.priority);
    const job = ready.shift();
    result.push({ ...job, start: time, completion: time + job.burst });
    time += job.burst;
  }
  return result;
}

function roundRobin(pList, quantum) {
  let time = 0, queue = [], result = [], remaining = pList.map(p => ({ ...p, remaining: p.burst }));
  queue.push(...remaining.filter(p => p.arrival <= time));
  let arrived = remaining.filter(p => p.arrival > time);

  while (queue.length > 0 || arrived.length > 0) {
    if (queue.length === 0) {
      time++;
      queue.push(...arrived.filter(p => p.arrival <= time));
      arrived = arrived.filter(p => p.arrival > time);
      continue;
    }

    let p = queue.shift();
    let execTime = Math.min(quantum, p.remaining);
    result.push({ ...p, start: time, completion: time + execTime });
    time += execTime;
    p.remaining -= execTime;

    queue.push(...arrived.filter(proc => proc.arrival <= time));
    arrived = arrived.filter(proc => proc.arrival > time);

    if (p.remaining > 0) queue.push(p);
  }
  return result;
}
function srtf(pList) {
  let time = 0, result = [], remaining = pList.map(p => ({ ...p, remaining: p.burst }));
  let gantt = [], active = null;

  while (remaining.length > 0) {
    let ready = remaining.filter(p => p.arrival <= time);
    if (ready.length === 0) {
      time++;
      continue;
    }

    ready.sort((a, b) => a.remaining - b.remaining || a.arrival - b.arrival);
    let current = ready[0];

    if (!active || active.pid !== current.pid) {
      gantt.push({ pid: current.pid, start: time });
      active = current;
    }

    current.remaining--;
    time++;

    if (current.remaining === 0) {
      let completion = time;
      result.push({ ...current, start: gantt.find(g => g.pid === current.pid).start, completion });
      remaining = remaining.filter(p => p.pid !== current.pid);
    }
  }

  return result;
}


function drawGanttChart(schedule) {
  const chart = document.getElementById('ganttChart');
  chart.innerHTML = '';
  const container = document.createElement('div');
  container.className = 'gantt-row';

  schedule.forEach(item => {
    const block = document.createElement('div');
    block.className = 'gantt-block';
    block.style.width = (item.completion - item.start) * 30 + 'px';
    block.innerHTML = `<div>${item.pid}</div><div class='time'>${item.start}-${item.completion}</div>`;
    container.appendChild(block);
  });

  chart.appendChild(container);
  schedule.forEach(item => {
    const block = document.createElement('div');
    block.className = 'gantt-block';
    block.textContent = item.pid;
    chart.appendChild(block);
  });
}

function showResults(schedule) {
  const results = document.getElementById('results');
  let html = `<table><tr><th>Process</th><th>Arrival</th><th>Burst</th><th>Completion</th><th>Turnaround</th><th>Waiting</th></tr>`;
  let totalTAT = 0, totalWT = 0;
  schedule.forEach(p => {
    const tat = p.completion - p.arrival;
    const wt = tat - p.burst;
    totalTAT += tat;
    totalWT += wt;
    html += `<tr><td>${p.pid}</td><td>${p.arrival}</td><td>${p.burst}</td><td>${p.completion}</td><td>${tat}</td><td>${wt}</td></tr>`;
  });
  html += `</table><p><strong>Avg TAT:</strong> ${(totalTAT/schedule.length).toFixed(2)} | <strong>Avg WT:</strong> ${(totalWT/schedule.length).toFixed(2)}</p>`;
  results.innerHTML = html;
}
