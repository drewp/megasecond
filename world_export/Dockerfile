FROM ubuntu:23.04

# based on https://github.com/nytimes/rd-blender-docker/blob/master/dist/2.92-cpu-ubuntu18.04/Dockerfile

WORKDIR /workspace

ENV LC_ALL C.UTF-8
ENV LANG C.UTF-8

ENV TZ=America/Los_Angeles
ENV LANG=en_US.UTF-8
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone
RUN echo 2023-07-03 && apt-get update
ENV DEBIAN_FRONTEND noninteractive
RUN apt-get install -y tzdata


ENV BLENDER_DOWNLOAD_VERSION=4.0.0-alpha+main.a3bfd6e20d26
ENV BLENDER_SHORT_VERSION=4.0

RUN apt-get install -y \
	build-essential \
	bzip2 \
	imagemagick-6.q16 \
	libfontconfig1 \
	libgl1-mesa-glx \
	libjpeg8 \
	libopenexr-dev \
	libxi-dev \
	libxmu-dev \
	libxrender1 \
	libxxf86vm-dev \
	strace \
	wget \
	xz-utils \
	zlib1g-dev

RUN wget https://builder.blender.org/download/daily/blender-${BLENDER_DOWNLOAD_VERSION}-linux.x86_64-release.tar.xz \
	&& tar -xvf blender-*.tar.xz --strip-components=1 -C /bin \
	&& rm -rf blender-*.tar.xz \
	&& rm -rf blender-*

ENV BLENDER_PATH "/bin/${BLENDER_SHORT_VERSION}"
ENV PATH "$PATH:${BLENDER_PATH}/python/bin"
ENV BLENDERPY "${BLENDER_PATH}/python/bin/python3.10"

RUN ${BLENDERPY} -m pip install -U pip
ENV BLENDERPIP "${BLENDER_PATH}/python/bin/pip3"

COPY requirements.txt ./
RUN ${BLENDERPIP} install -r requirements.txt

ENV HW="CPU"

RUN apt-get install -y libxkbcommon0