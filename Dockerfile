FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
	PYTHONUNBUFFERED=1 \
	NODE_ENV=development

WORKDIR /app

RUN apt-get update \
	&& apt-get install -y --no-install-recommends nodejs npm \
	&& rm -rf /var/lib/apt/lists/*

COPY requirements.txt package.json package-lock.json ./
RUN pip install --no-cache-dir -r requirements.txt \
	&& npm ci

COPY . .

EXPOSE 5173 8000

CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
