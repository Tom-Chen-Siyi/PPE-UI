# PPE Video Annotation Viewer - Docker Deployment

This document provides instructions for running the PPE Video Annotation Viewer using Docker containers.

## Prerequisites

### For Windows:

1. Install [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop)
2. Ensure Docker Desktop is running
3. Enable WSL 2 backend (recommended)

### For macOS:

1. Install [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop)
2. Ensure Docker Desktop is running

### For Linux:

1. Install Docker Engine: `sudo apt-get install docker.io`
2. Install Docker Compose: `sudo apt-get install docker-compose`
3. Add your user to docker group: `sudo usermod -aG docker $USER`
4. Start Docker service: `sudo systemctl start docker`

## Quick Start

### Option 1: Using Docker Compose (Recommended)

1. **Clone or download the project**

   ```bash
   git clone <repository-url>
   cd PPE
   ```

2. **Run the application**

   ```bash
   # For Windows
   scripts\quick-start.bat

   # For macOS/Linux
   docker-compose up
   ```

3. **Access the application**
   - Open your browser and go to: http://localhost:3000

### Option 2: Using Docker directly

1. **Build the image**

   ```bash
   # For Windows
   scripts\run-ppe-viewer.bat

   # For macOS/Linux
   scripts/docker-build.sh
   ```

2. **Run the container**
   ```bash
   docker run -p 3000:3000 \
     -v $(pwd)/uploads:/app/uploads \
     -v $(pwd)/temp:/app/temp \
     ppe-video-viewer:latest
   ```

## Docker Commands Reference

### Build the image

```bash
docker build -t ppe-video-viewer:latest .
```

### Run with Docker Compose

```bash
# Start in foreground
docker-compose up

# Start in background
docker-compose up -d

# Stop the application
docker-compose down

# View logs
docker-compose logs -f
```

### Run with Docker directly

```bash
# Run container
docker run --name ppe-video-viewer \
  -p 3000:3000 \
  -v $(pwd)/uploads:/app/uploads \
  -v $(pwd)/temp:/app/temp \
  ppe-video-viewer:latest

# Stop container
docker stop ppe-video-viewer

# Remove container
docker rm ppe-video-viewer

# View logs
docker logs ppe-video-viewer
```

### Container management

```bash
# List running containers
docker ps

# List all containers
docker ps -a

# List images
docker images

# Remove image
docker rmi ppe-video-viewer:latest

# Clean up unused resources
docker system prune
```

## Volume Mounts

The application uses the following volume mounts:

- `./uploads:/app/uploads` - Persistent storage for uploaded videos and extracted frames
- `./temp:/app/temp` - Temporary files storage

## Environment Variables

You can customize the application by setting environment variables:

```bash
# In docker-compose.yml
environment:
  - NODE_ENV=production
  - PORT=3000

# Or when running with docker run
docker run -e NODE_ENV=production -e PORT=3000 ...
```

## Development Mode

For development, use the development Docker configuration:

```bash
# Build development image
docker build -f Dockerfile.dev -t ppe-video-viewer:dev .

# Run with development compose
docker-compose -f docker-compose.dev.yml up
```

## Troubleshooting

### Port already in use

If port 3000 is already in use, change the port mapping:

```bash
# In docker-compose.yml
ports:
  - "3001:3000"  # Use port 3001 on host

# Or with docker run
docker run -p 3001:3000 ...
```

### Permission issues (Linux)

If you encounter permission issues on Linux:

```bash
# Fix ownership of mounted directories
sudo chown -R $USER:$USER uploads temp

# Or run with different user
docker run -u $(id -u):$(id -g) ...
```

### Container won't start

Check the container logs:

```bash
# With docker-compose
docker-compose logs

# With docker
docker logs ppe-video-viewer
```

### Out of disk space

Clean up Docker resources:

```bash
# Remove unused containers, networks, images
docker system prune

# Remove all unused images
docker system prune -a
```

## Performance Optimization

### For better performance on Windows:

1. Enable WSL 2 backend in Docker Desktop
2. Allocate more memory to Docker (8GB+ recommended)
3. Enable file sharing for your project directory

### For better performance on macOS:

1. Allocate more memory to Docker (8GB+ recommended)
2. Enable file sharing for your project directory

### For better performance on Linux:

1. Use overlay2 storage driver
2. Ensure sufficient disk space for images and containers

## Security Considerations

1. **Network isolation**: The application runs in an isolated network
2. **Volume mounts**: Only necessary directories are mounted
3. **Non-root user**: Consider running the container as a non-root user
4. **Image scanning**: Regularly scan Docker images for vulnerabilities

## Backup and Restore

### Backup data

```bash
# Backup uploads directory
tar -czf ppe-backup-$(date +%Y%m%d).tar.gz uploads/
```

### Restore data

```bash
# Extract backup
tar -xzf ppe-backup-YYYYMMDD.tar.gz

# Ensure proper permissions
chmod -R 755 uploads/
```

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review the container logs
3. Ensure Docker and Docker Compose are up to date
4. Verify system requirements are met

For additional help, please refer to the main README.md file or create an issue in the project repository.
