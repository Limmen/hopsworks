package io.hops.hopsworks.common.hive;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * Type of Hive Table
 */
public enum HiveTableType {
  @JsonProperty("MANAGED_TABLE")
  MANAGED_TABLE,
  @JsonProperty("EXTERNAL_TABLE")
  EXTERNAL_TABLE;
}
