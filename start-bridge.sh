#!/bin/bash

BRIDGE='./target/release/bridge'

RUST_LOG=info RUST_BACKTRACE=1 $BRIDGE --config config.toml --database db.toml --allow-insecure-rpc-endpoints
