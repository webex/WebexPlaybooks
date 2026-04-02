# Build context: this src/ directory (see playbook README).
FROM python:3.9-slim-bookworm

WORKDIR /app

RUN pip install --no-cache-dir --upgrade pip

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY auto_leave.py ./
# Default config for first run; override with a bind-mounted auto_leave.yml
COPY auto_leave.yml.sample ./auto_leave.yml

ENV PYTHONUNBUFFERED=1

CMD ["python", "auto_leave.py"]
