/*
 * This file is part of Hopsworks
 * Copyright (C) 2018, Logical Clocks AB. All rights reserved
 *
 * Hopsworks is free software: you can redistribute it and/or modify it under the terms of
 * the GNU Affero General Public License as published by the Free Software Foundation,
 * either version 3 of the License, or (at your option) any later version.
 *
 * Hopsworks is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY;
 * without even the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR
 * PURPOSE.  See the GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License along with this program.
 * If not, see <https://www.gnu.org/licenses/>.
 */

package io.hops.hopsworks.common.dao.featurestore.featuregroup;

import io.hops.hopsworks.common.dao.featurestore.FeaturestoreEntityDTO;
import io.hops.hopsworks.common.hive.HiveTableType;

import javax.xml.bind.annotation.XmlElement;
import javax.xml.bind.annotation.XmlRootElement;
import java.util.List;

/**
 * DTO containing the human-readable information of a featuregroup, can be converted to JSON or XML representation
 * using jaxb.
 */
@XmlRootElement
public class FeaturegroupDTO extends FeaturestoreEntityDTO {

  private List<String> hdfsStorePaths;
  private boolean hudi = false;
  private String inputFormat;
  private HiveTableType hiveTableType;

  public FeaturegroupDTO() {
    super(null, null, null, null, null, null,
        null);
  }

  public FeaturegroupDTO(Featuregroup featuregroup) {
    super(featuregroup.getFeaturestore().getId(), featuregroup.getCreated(),
        featuregroup.getCreator(), featuregroup.getVersion(),
        (List) featuregroup.getStatistics(), featuregroup.getJob(),
        featuregroup.getId());
    this.hdfsStorePaths = null;
    this.hudi = false;
    this.inputFormat = null;
    this.hiveTableType = null;
  }

  @XmlElement
  public List<String> getHdfsStorePaths() {
    return hdfsStorePaths;
  }


  public void setHdfsStorePaths(List<String> hdfsStorePaths) {
    this.hdfsStorePaths = hdfsStorePaths;
  }
  
  @XmlElement
  public boolean isHudi() {
    return hudi;
  }
  
  public void setHudi(boolean hudi) {
    this.hudi = hudi;
  }
  
  @XmlElement
  public String getInputFormat() {
    return inputFormat;
  }
  
  public void setInputFormat(String inputFormat) {
    this.inputFormat = inputFormat;
  }
  
  @XmlElement
  public HiveTableType getHiveTableType() {
    return hiveTableType;
  }
  
  public void setHiveTableType(HiveTableType hiveTableType) {
    this.hiveTableType = hiveTableType;
  }
  
  @Override
  public String toString() {
    return "FeaturegroupDTO{" +
      "hdfsStorePaths=" + hdfsStorePaths +
      ", hudi=" + hudi +
      ", inputFormat='" + inputFormat + '\'' +
      ", hiveTableType=" + hiveTableType +
      '}';
  }
}
