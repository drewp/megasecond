IMG=mega_blender

docker_build:
	docker build -t ${IMG} .

show_docker_blender_version:
	docker run ${IMG} blender -v

old_export:
	python3 ./run_export.py

shell:
	docker run -it --cap-add=SYS_PTRACE -v `pwd`/..:/workspace ${IMG} /bin/bash

export:
	docker run -v `pwd`/..:/workspace ${IMG} doit -f world_export/doit_tasks.py --dir /workspace run

export_forever:
	docker run -v `pwd`/..:/workspace ${IMG} doit -f world_export/doit_tasks.py --dir /workspace auto

strace_task:
	@echo task is set to ${TASK}
	docker run --cap-add=SYS_PTRACE -v `pwd`/..:/workspace ${IMG} doit -f world_export/doit_tasks.py --dir /workspace strace ${TASK}