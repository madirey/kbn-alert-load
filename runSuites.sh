#!/bin/bash
testLength=30
ecctlConfig=config
kbn-alert-load run -M $testLength -C $ecctlConfig indicator-index-50000-es-2x64GB-kb-16x8GB-rules-100,200,300
kbn-alert-load run -M $testLength -C $ecctlConfig indicator-index-50000-es-2x64GB-kb-16x8GB-rules-400,600,800
kbn-alert-load run -M $testLength -C $ecctlConfig indicator-index-100000-es-2x64GB-kb-16x8GB-rules-100,200,300
kbn-alert-load run -M $testLength -C $ecctlConfig indicator-index-250000-es-2x64GB-kb-16x8GB-rules-25,50,75
kbn-alert-load run -M $testLength -C $ecctlConfig indicator-index-250000-es-2x64GB-kb-16x8GB-rules-100,200,300
kbn-alert-load run -M $testLength -C $ecctlConfig indicator-index-50000-es-4x64GB-kb-16x8GB-rules-400,600,800
kbn-alert-load run -M $testLength -C $ecctlConfig indicator-index-100000-es-4x64GB-kb-16x8GB-rules-100,200,300
kbn-alert-load run -M $testLength -C $ecctlConfig indicator-index-100000-es-4x64GB-kb-16x8GB-rules-400,600,800
kbn-alert-load run -M $testLength -C $ecctlConfig indicator-index-250000-es-4x64GB-kb-16x8GB-rules-25,50,75
kbn-alert-load run -M $testLength -C $ecctlConfig indicator-index-250000-es-4x64GB-kb-16x8GB-rules-100,200,300