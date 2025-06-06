from fastapi import FastAPI, HTTPException, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
import os
import asyncio
import json
import tempfile
import shutil
from starlette.websockets import WebSocketDisconnect
from pathlib import Path
import uuid
import base64
import docker
import tarfile
import io
from typing import Optional, Dict, Any

app = FastAPI(
    title="Code Execution API with Docker",
    description="Execute Python code in isolated Docker containers",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://*.vercel.app",
        "https://*.fly.dev"
        # ...
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Docker client
try:
    docker_client = docker.from_env()
    print("Docker client initialized successfully")
except Exception as e:
    print(f"Failed to initialize Docker client: {e}")
    docker_client = None

# Store Docker containers for each session
docker_sessions = {}

class CodeInput(BaseModel):
    sourceCode: str
    email: Optional[str] = None

class DockerSession:
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.container = None
        self.container_id = None
        self.files = {}
        self.current_file = "script.py"

        # Create container
        self._create_container()

    def _create_container(self):
        """Create a new Docker container for this session"""
        try:
            if not docker_client:
                raise Exception("Docker client not available")

            # Create container from our Python image
            self.container = docker_client.containers.run(
                "python-executor:latest",
                command="tail -f /dev/null",
                detach=True,
                remove=False,
                working_dir="/app",
                volumes={
                    f"session_{self.session_id}": {"bind": "/app/user_files", "mode": "rw"}
                },
                name=f"code_session_{self.session_id}",
                mem_limit="512m",
                cpu_quota=50000,
                network_mode="none"
            )
            self.container_id = self.container.id
            print(f"Created container {self.container_id[:12]} for session {self.session_id}")

            # Create initial script file
            self.create_file("script.py", '')

        except Exception as e:
            print(f"Failed to create container: {e}")
            raise

    def create_file(self, filename: str, content: str = ""):
        """Create or update a file in the container"""
        self.files[filename] = content

        if self.container:
            try:
                # Create a tar archive with the file content
                tar_stream = io.BytesIO()
                with tarfile.open(fileobj=tar_stream, mode='w') as tar:
                    file_data = content.encode('utf-8')
                    tarinfo = tarfile.TarInfo(name=filename)
                    tarinfo.size = len(file_data)
                    tar.addfile(tarinfo, io.BytesIO(file_data))

                tar_stream.seek(0)
                self.container.put_archive("/app/user_files", tar_stream)

            except Exception as e:
                print(f"Failed to create file {filename}: {e}")

    def get_file(self, filename: str) -> str:
        """Get file content from container"""
        if filename in self.files:
            return self.files[filename]

        try:
            # Try to read from container
            archive, _ = self.container.get_archive(f"/app/user_files/{filename}")
            tar_stream = io.BytesIO(b''.join(archive))
            with tarfile.open(fileobj=tar_stream, mode='r') as tar:
                member = tar.getmember(filename)
                file_content = tar.extractfile(member).read().decode('utf-8')
                self.files[filename] = file_content
                return file_content
        except:
            return ""

    def list_files(self) -> list:
        """List files in the container"""
        try:
            result = self.container.exec_run("ls -la /app/user_files", user="codeuser")
            if result.exit_code == 0:
                lines = result.output.decode().strip().split('\n')[1:]  # Skip first line
                files = []
                for line in lines:
                    if line and not line.startswith('d'):  # Skip directories
                        parts = line.split()
                        if len(parts) >= 9:
                            filename = ' '.join(parts[8:])
                            if filename not in ['.', '..']:
                                files.append(filename)
                return files
            return list(self.files.keys())
        except:
            return list(self.files.keys())

    def file_exists(self, filename: str) -> bool:
        """Check if file exists"""
        return filename in self.files or self._file_exists_in_container(filename)

    def _file_exists_in_container(self, filename: str) -> bool:
        """Check if file exists in container"""
        try:
            result = self.container.exec_run(f"test -f /app/user_files/{filename}", user="codeuser")
            return result.exit_code == 0
        except:
            return False

    def delete_file(self, filename: str):
        """Delete a file"""
        if filename in self.files:
            del self.files[filename]

        try:
            self.container.exec_run(f"rm -f /app/user_files/{filename}", user="codeuser")
        except:
            pass

    def execute_command(self, command: str, email: Optional[str] = None) -> str:
        """Execute a command in the container"""

        # Can pass in email here to check if user is authorized
        if not email or email != "user@gmail.com":
            return "Error: Unauthorized. Only authorized users can execute commands."

        command = command.strip()

        if not command:
            return ""

        try:
            # Handle different commands
            if command == "ls" or command == "ls -la" or command == "dir":
                result = self.container.exec_run("ls -la /app/user_files", user="codeuser")
            elif command.startswith("cat "):
                filename = command[4:].strip()
                result = self.container.exec_run(f"cat /app/user_files/{filename}", user="codeuser")
            elif command.startswith("echo "):
                text = command[5:]
                result = self.container.exec_run(f'/bin/sh -c "echo \\"{text}\\""', user="codeuser")
            elif command == "pwd":
                result = self.container.exec_run("pwd", user="codeuser", workdir="/app/user_files")
            elif command.startswith("python ") or command.startswith("python3 "):
                parts = command.split()
                filename = parts[1] if len(parts) > 1 else "script.py"
                result = self.container.exec_run(
                    f"python3 {filename}",
                    user="codeuser",
                    workdir="/app/user_files"
                )
            elif command == "python" or command == "python3":
                result = self.container.exec_run(
                    f"python3 {self.current_file}",
                    user="codeuser",
                    workdir="/app/user_files"
                )
            elif command.startswith("pip ") or command.startswith("pip3 "):
                result = self.container.exec_run(command, user="codeuser", workdir="/app/user_files")
            elif command.startswith("touch "):
                filename = command[6:].strip()
                result = self.container.exec_run(f"touch /app/user_files/{filename}", user="codeuser")
                self.files[filename] = ""
            elif command.startswith("rm "):
                filename = command[3:].strip()
                result = self.container.exec_run(f"rm /app/user_files/{filename}", user="codeuser")
                if filename in self.files:
                    del self.files[filename]
            elif command == "clear":
                return "\033[2J\033[H"
            else:
                # Execute any other command using shell
                result = self.container.exec_run(
                    f'/bin/sh -c "cd /app/user_files && {command}"',
                    user="codeuser"
                )

            if result.exit_code == 0:
                return result.output.decode('utf-8', errors='ignore')
            else:
                return result.output.decode('utf-8', errors='ignore')

        except Exception as e:
            return f"Error executing command: {str(e)}\n"

    def execute_python_code(self, code: str, email: Optional[str] = None) -> Dict[str, Any]:
        """Execute Python code and return output with any generated files"""

        # Can pass in email here to check if user is authorized
        if not email or email != "user@gmail.com":
            return {
                "run": {
                    "stdout": "",
                    "stderr": "Error: Unauthorized. Only authorized users can execute code.",
                    "code": 1
                },
                "files": []
            }

        try:
            # Update script.py with the new code
            self.create_file("script.py", code)

            # Execute the code
            result = self.container.exec_run(
                "python3 script.py",
                user="codeuser",
                workdir="/app/user_files"
            )

            stdout = result.output.decode('utf-8', errors='ignore')
            stderr = ""

            if result.exit_code != 0:
                stderr = stdout
                stdout = ""

            # Check for generated files
            generated_files = self._get_generated_files()

            return {
                "run": {
                    "stdout": stdout,
                    "stderr": stderr,
                    "code": result.exit_code
                },
                "files": generated_files
            }

        except Exception as e:
            return {
                "run": {
                    "stdout": "",
                    "stderr": f"Execution error: {str(e)}",
                    "code": 1
                },
                "files": []
            }

    def _get_generated_files(self) -> list:
        """Get list of generated files (images, etc.) from container"""
        generated_files = []
        try:
            # Look for common image file extensions
            extensions = ['png', 'jpg', 'jpeg', 'gif', 'svg', 'pdf']
            for ext in extensions:
                result = self.container.exec_run(
                    f"find /app/user_files -name '*.{ext}' -type f",
                    user="codeuser"
                )
                if result.exit_code == 0:
                    files = result.output.decode().strip().split('\n')
                    for file_path in files:
                        if file_path:
                            filename = os.path.basename(file_path)
                            # Get file content as base64
                            try:
                                archive, _ = self.container.get_archive(file_path)
                                tar_stream = io.BytesIO(b''.join(archive))
                                with tarfile.open(fileobj=tar_stream, mode='r') as tar:
                                    member = tar.getmember(filename)
                                    file_content = tar.extractfile(member).read()
                                    file_b64 = base64.b64encode(file_content).decode()
                                    generated_files.append({
                                        "name": filename,
                                        "type": f"image/{ext}",
                                        "content": file_b64
                                    })
                            except Exception as e:
                                print(f"Error reading file {filename}: {e}")
        except Exception as e:
            print(f"Error getting generated files: {e}")

        return generated_files

    def cleanup(self):
        """Cleanup container and resources"""
        try:
            if self.container:
                self.container.stop()
                self.container.remove()
                print(f"Cleaned up container for session {self.session_id}")
        except Exception as e:
            print(f"Error cleaning up container: {e}")

class VirtualTerminal:
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.docker_session = DockerSession(session_id)

    def execute_command(self, command: str, email: Optional[str] = None) -> str:
        """Execute command using Docker session"""
        return self.docker_session.execute_command(command, email=email)

    def update_file(self, filename: str, content: str):
        """Update file content"""
        self.docker_session.create_file(filename, content)

@app.get("/")
async def root():
    return {
        "message": "Code Execution API with Docker running",
        "docs": "/docs",
        "execute_endpoint": "/execute",
        "docker_available": docker_client is not None
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "code-execution-api-docker",
        "docker_available": docker_client is not None
    }

@app.post("/execute")
async def execute_python_code(payload: CodeInput):
    """Execute Python code in a temporary Docker container"""
    if not docker_client:
        raise HTTPException(status_code=503, detail="Docker not available")

    temp_session_id = str(uuid.uuid4())

    try:
        docker_session = DockerSession(temp_session_id)
        result = docker_session.execute_python_code(payload.sourceCode, email=payload.email)
        docker_session.cleanup()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Execution error: {str(e)}")

@app.post("/update-file/{session_id}")
async def update_file(session_id: str, payload: dict):
    """Update file content in Docker session"""
    if session_id not in docker_sessions:
        docker_sessions[session_id] = VirtualTerminal(session_id)

    filename = payload.get("filename", "script.py")
    content = payload.get("content", "")

    docker_sessions[session_id].update_file(filename, content)
    return {"status": "success"}

@app.get("/files/{session_id}")
async def list_session_files(session_id: str):
    """List all files in a session"""
    if session_id not in docker_sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    try:
        docker_session = docker_sessions[session_id].docker_session

        # Get list of files from container
        result = docker_session.container.exec_run(
            "find /app/user_files -type f -printf '%f\n'",
            user="codeuser"
        )

        if result.exit_code == 0:
            files = [f.strip() for f in result.output.decode().strip().split('\n') if f.strip()]
            file_info = []

            # Get file sizes and details
            for filename in files:
                try:
                    stat_result = docker_session.container.exec_run(
                        f"stat -c '%s %Y' /app/user_files/{filename}",
                        user="codeuser"
                    )
                    if stat_result.exit_code == 0:
                        size, mtime = stat_result.output.decode().strip().split()
                        file_info.append({
                            "name": filename,
                            "size": int(size),
                            "modified": int(mtime),
                            "download_url": f"/download/{session_id}/{filename}"
                        })
                except Exception:
                    # If stat fails, just include basic info
                    file_info.append({
                        "name": filename,
                        "size": 0,
                        "modified": 0,
                        "download_url": f"/download/{session_id}/{filename}"
                    })

            return {
                "session_id": session_id,
                "files": file_info,
                "count": len(file_info)
            }
        else:
            return {
                "session_id": session_id,
                "files": [],
                "count": 0
            }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error listing files: {str(e)}")

@app.get("/download/{session_id}/{filename}")
async def download_file(session_id: str, filename: str):
    """Download a file from the Docker container"""
    if session_id not in docker_sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    try:
        docker_session = docker_sessions[session_id].docker_session

        # Check if file exists in container
        result = docker_session.container.exec_run(
            f"test -f /app/user_files/{filename}",
            user="codeuser"
        )

        if result.exit_code != 0:
            raise HTTPException(status_code=404, detail=f"File '{filename}' not found")

        # Get the file archive from container
        archive, _ = docker_session.container.get_archive(f"/app/user_files/{filename}")

        # Extract the file from tar archive
        tar_stream = io.BytesIO()
        for chunk in archive:
            tar_stream.write(chunk)
        tar_stream.seek(0)

        # Extract file content from tar
        with tarfile.open(fileobj=tar_stream, mode='r') as tar:
            # Get the file member
            member = tar.getmember(filename)
            file_content = tar.extractfile(member).read()

        # Create temporary file
        temp_dir = tempfile.mkdtemp()
        temp_file = os.path.join(temp_dir, filename)

        # Write extracted content to temp file
        with open(temp_file, 'wb') as f:
            f.write(file_content)

        # Determine media type based on file extension
        media_type = 'application/octet-stream'
        if filename.lower().endswith(('.png', '.jpg', '.jpeg')):
            media_type = f'image/{filename.split(".")[-1].lower()}'
        elif filename.lower().endswith('.pdf'):
            media_type = 'application/pdf'
        elif filename.lower().endswith('.csv'):
            media_type = 'text/csv'
        elif filename.lower().endswith('.json'):
            media_type = 'application/json'
        elif filename.lower().endswith('.txt'):
            media_type = 'text/plain'

        return FileResponse(
            path=temp_file,
            filename=filename,
            media_type=media_type
        )

    except HTTPException:
        raise  # Re-raise HTTP exceptions
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Download error: {str(e)}")

@app.websocket("/ws/{session_id}")
async def terminal_ws(websocket: WebSocket, session_id: str = None):
    await websocket.accept()

    if not docker_client:
        await websocket.send_text("Docker not available\n")
        await websocket.close()
        return

    if session_id not in docker_sessions:
        try:
            docker_sessions[session_id] = VirtualTerminal(session_id)
        except Exception as e:
            await websocket.send_text(f"Failed to create session: {str(e)}\n")
            await websocket.close()
            return

    terminal = docker_sessions[session_id]

    welcome_msg = f"\033[1;32mDocker Terminal - Session {session_id[:8]}\033[0m\n"
    welcome_msg += f"Container: {terminal.docker_session.container_id[:12]}\n"
    welcome_msg += f"\033[1;34muser@container:~$\033[0m "
    await websocket.send_text(welcome_msg)

    current_command = ""

    try:
        while True:
            data = await websocket.receive_text()
            try:
                # Can try to parse the data as JSON to get email
                message = json.loads(data)
                email = message.get("email")
                command = message.get("command", "")
            except json.JSONDecodeError:
                # If not JSON, treat as plain command without email
                email = None
                command = data

            for char in command:
                if char == '\r' or char == '\n':
                    if current_command.strip():
                        await websocket.send_text("\n")
                        output = terminal.execute_command(current_command, email=email)
                        if output:
                            await websocket.send_text(output)
                    else:
                        await websocket.send_text("\n")

                    await websocket.send_text(f"\033[1;34muser@container:~$\033[0m ")
                    current_command = ""

                elif char == '\x7f' or char == '\b':  # Backspace
                    if current_command:
                        current_command = current_command[:-1]
                        await websocket.send_text('\b \b')

                elif char == '\x03':  # Ctrl+C
                    await websocket.send_text("^C\n")
                    await websocket.send_text(f"\033[1;34muser@container:~$\033[0m ")
                    current_command = ""

                elif ord(char) >= 32:  # Printable characters
                    current_command += char
                    await websocket.send_text(char)

    except WebSocketDisconnect:
        if session_id in docker_sessions:
            docker_sessions[session_id].docker_session.cleanup()
            del docker_sessions[session_id]

# Cleanup
@app.on_event("shutdown")
async def cleanup_containers():
    """Cleanup all Docker containers on shutdown"""
    for session_id, terminal in docker_sessions.items():
        try:
            terminal.docker_session.cleanup()
        except Exception as e:
            print(f"Error cleaning up session {session_id}: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
