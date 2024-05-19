#!/bin/bash
set -euxo pipefail

# SCALE_FACTOR=0.003

# DATAGEN_VERSION="0.5.0"
# PLATFORM_VERSION="2.12_spark3.2"
# IMAGE="ldbc/datagen-standalone:${DATAGEN_VERSION}-${PLATFORM_VERSION}"

# mkdir -p out_sf${SCALE_FACTOR}_bi   # create output directory
# docker run \
#     --mount type=bind,source="$(pwd)"/out_sf${SCALE_FACTOR}_bi,target=/out \
#     --mount type=bind,source="$(pwd)"/conf,target=/conf,readonly \
#     -e SPARK_CONF_DIR=/conf \
#     "$IMAGE" \
#     --parallelism 1 \
#     -- \
#     --format csv \
#     --scale-factor ${SCALE_FACTOR} \
#     --mode bi \
#     --generate-factors

#rm -rf social_network/ substitution_parameters && \
docker run --rm --mount type=bind,source="$(pwd)/out",target="/opt/ldbc_snb_datagen/out" --mount type=bind,source="$(pwd)/params.ini",target="/opt/ldbc_snb_datagen/params.ini" rubensworks/ldbc_snb_datagen:latest; \
#sudo chown -R $USER:$USER social_network/ substitution_parameters/