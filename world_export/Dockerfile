FROM ubuntu:18.04

# based on https://github.com/nytimes/rd-blender-docker/blob/master/dist/2.92-cpu-ubuntu18.04/Dockerfile

WORKDIR /workspace

ENV TZ=America/Los_Angeles
ENV LANG=en_US.UTF-8
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

RUN echo run again 2021-03-04
RUN apt-get update
RUN DEBIAN_FRONTEND=noninteractive apt-get install -y tzdata

# Enviorment variables
ENV DEBIAN_FRONTEND noninteractive
ENV LC_ALL C.UTF-8
ENV LANG C.UTF-8
ENV PATH "$PATH:/bin/2.92/python/bin/"
ENV BLENDER_PATH "/bin/2.92"
ENV BLENDERPIP "/bin/2.92/python/bin/pip3"
ENV BLENDERPY "/bin/2.92/python/bin/python3.7m"
ENV HW="CPU"

# Install dependencies
RUN apt-get install -y \ 
	wget \ 
	libopenexr-dev \ 
	bzip2 \ 
	build-essential \ 
	zlib1g-dev \ 
	libxmu-dev \ 
	libxi-dev \ 
	libxxf86vm-dev \ 
	libfontconfig1 \ 
	libxrender1 \ 
	libgl1-mesa-glx \ 
	xz-utils \
	libjpeg8 \
	imagemagick-6.q16 \
	strace

# Download and install Blender
RUN wget https://mirror.clarkson.edu/blender/release/Blender2.92/blender-2.92.0-linux64.tar.xz \ 
	&& tar -xvf blender-2.92.0-linux64.tar.xz --strip-components=1 -C /bin \ 
	&& rm -rf blender-2.92.0-linux64.tar.xz \ 
	&& rm -rf blender-2.92.0-linux64 

# Download the Python source since it is not bundled with Blender
RUN wget https://www.python.org/ftp/python/3.7.0/Python-3.7.0.tgz \ 
	&& tar -xzf Python-3.7.0.tgz \ 
	&& cp -r Python-3.7.0/Include/* $BLENDER_PATH/python/include/python3.7m/ \ 
	&& rm -rf Python-3.7.0.tgz \ 
	&& rm -rf Python-3.7.0 

# Blender comes with a super outdated version of numpy (which is needed for matplotlib / opencv) so override it with a modern one
RUN rm -rf ${BLENDER_PATH}/python/lib/python3.7/site-packages/numpy 

# Must first ensurepip to install Blender pip3 and then new numpy
RUN ${BLENDERPY} -m ensurepip && ${BLENDERPIP} install --upgrade pip 

COPY requirements.txt ./
RUN ${BLENDERPIP} install -r requirements.txt
