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

/**
 * Controller for the featurestore page.
 */
'use strict';

angular.module('hopsWorksApp')
    .controller('featurestoreCtrl', ['$scope', '$routeParams', 'growl', 'FeaturestoreService', '$location', '$interval',
        '$mdSidenav', 'ModalService', 'JobService', 'TourService', 'ProjectService',
        function ($scope, $routeParams, growl, FeaturestoreService, $location, $interval, $mdSidenav, ModalService, JobService,
                  TourService, ProjectService) {


            /**
             * Initialize controller state
             */
            var self = this;
            self.projectId = $routeParams.projectID;
            self.featurestores = [];
            self.features = [];
            self.trainingDatasets = [];
            self.featuregroups = [];
            self.jobs = [];
            self.pageSize = 11;
            self.featuresPageSize = 10;
            self.currentPage = 1;
            self.featurestore;
            self.featureSearchQuery = "";
            self.featurestoreEntitySortKey = 'name';
            self.featuresSortKey = 'name';
            self.reverse = false;
            self.featuresReverse = false;
            self.fseFilter = "";
            self.firstPull = false;
            self.featuregroupsDictList = [];
            self.trainingDatasetsDictList = [];
            self.featurestoreEntitiesDictList = [];
            self.loading = false;
            self.loadingText = "";
            self.featuregroupsLoaded = false;
            self.jobsLoaded = false;
            self.trainingDatasetsLoaded = false;
            self.quotaLoaded = false;
            self.tourService = TourService;
            self.tourService.currentStep_TourNine = 0; //Feature store tour
            self.featureSearchResult = null;
            self.featureSearchResultFeaturegroups = []
            self.selectedSearchFeaturegroup;
            self.featurestoreSizeWorking = false
            self.featurestoreSize = "Not fetched"
            self.featuregroupSizeWorking = false
            self.featuregroupSize = "Not fetched"
            self.fe_jobs = []
            self.date = new Date()
            self.numRecentFeJobs = 10
            self.quotaChartOptions = null;
            self.quotaChart = null;
            self.quotas = null;
            self.featureProgressChartOptions = null;
            self.featureProgressChart = null;
            self.numFeatureProgressChartDataPoints = 5;

            /**
             * Called when clicking the sort-arrow in the UI of featuregroup/training datasets table
             *
             * @param keyname
             */
            self.sort = function (keyname) {
                self.sortKey = keyname;   //set the sortKey to the param passed
                self.featurestoreEntitySortKey = keyname
                self.reverse = !self.reverse; //if true make it false and vice versa
            };

            /**
             * Called when clicking the sort-arrow in the UI of features table
             *
             * @param keyname
             */
            self.sortFeature = function (keyname) {
                self.sortKey = keyname;   //set the sortKey to the param passed
                self.featuresSortKey = keyname;
                self.featuresReverse = !self.featuresReverse; //if true make it false and vice versa
            };

            /**
             * Function to start the loading screen
             *
             * @param label the text to show to the user while loading
             */
            self.startLoading = function (label) {
                self.loading = true;
                self.loadingText = label;
            };

            /**
             * Function to get the current index in the paginated features table
             *
             * @param pageIndex the index in the current page
             */
            self.getTotalIndex = function (pageIndex) {
                return ((self.currentPage - 1) * self.featuresPageSize) + pageIndex + 1
            };

            /**
             * Function to stop the loading screen
             */
            self.stopLoading = function () {
                if (self.featuregroupsLoaded && self.trainingDatasetsLoaded && self.jobsLoaded && self.quotaLoaded) {
                    self.renderFeatureProgressChart();
                    self.renderQuotaChart();
                    self.setFeatureEngineeringJobs();
                    self.loading = false;
                    self.loadingText = "";
                }
            };

            /**
             * Search for a feature name
             */
            self.featureSearch = function (searchQuery) {
                self.featureSearchResultFeaturegroups = []
                self.featureSearchResultFeatures = []
                for (var i = 0; i < self.features.length; i++) {
                    if (self.features[i].name == searchQuery) {
                        var fg = {
                            "name": self.features[i].featuregroup,
                            "longName": self.getFeaturegroupSelectName(self.features[i].featuregroup, self.features[i].version),
                            "featuregroup": self.getFeaturegroupByNameAndVersion(self.features[i].featuregroup, self.features[i].version)
                        }
                        self.featureSearchResultFeaturegroups.push(fg)
                        self.featureSearchResultFeatures.push(self.features[i])
                    }
                }
                if (self.featureSearchResultFeatures.length == 0) {
                    self.featureSearchResult = "Feature '" + searchQuery + "' not found.";
                } else {
                    self.featureSearchResult = self.featureSearchResultFeatures[0]
                    self.selectedSearchFeaturegroup = self.featureSearchResultFeaturegroups[0]
                    self.fetchFeaturegroupSize(self.selectedSearchFeaturegroup.featuregroup)
                }
            };

            /**
             * Check whether there exists multiple search results
             * @returns {boolean}
             */
            self.hasMultipleSearchResults = function () {
                return self.hasFeatureSearchResult() && self.featureSearchResultFeaturegroups.length > 1
            };

            /**
             * Reset feature search result
             */
            self.resetFeatureSearchResult = function () {
                self.featureSearchResult = null
            };

            /**
             * Check whether feature search result is available
             */
            self.hasFeatureSearchResult = function () {
                if (!self.featureSearchResult || self.featureSearchResult == undefined || self.featureSearchResult == null) {
                    return false
                } else {
                    return true
                }
            };

            /**
             * Check whether feature search result is "not found"
             */
            self.featureSearchResultIsNotFound = function () {
                if (self.hasFeatureSearchResult() && typeof self.featureSearchResult === 'string' &&
                    self.featureSearchResult.includes("not found")) {
                    return true;
                } else {
                    return false;
                }
            };

            /**
             * Shows the Modal for creating new feature groups through the UI
             */
            self.showCreateFeaturegroupForm = function () {
                ModalService.createFeaturegroup('lg', self.projectId, self.featurestore, self.jobs, self.featuregroups)
                    .then(
                        function (success) {
                            self.getFeaturegroups(self.featurestore)
                        }, function (error) {
                            //The user changed their mind.
                        });
            };

            /**
             * Shows the Modal for creating new training datasets through the UI
             */
            self.showCreateTrainingDatasetForm = function () {
                ModalService.createTrainingDataset('lg', self.projectId, self.featurestore, self.jobs, self.trainingDatasets)
                    .then(
                        function (success) {
                            self.getTrainingDatasets(self.featurestore)
                        }, function (error) {
                        });
            };

            /**
             * Retrieves a list of all featurestores for the project from the backend
             */
            self.getFeaturestores = function () {
                FeaturestoreService.getFeaturestores(self.projectId).then(
                    function (success) {
                        self.featurestores = success.data;
                        self.featurestore = self.featurestores[0];
                        self.fetchFeaturestoreSize();
                        if (!self.firstPull) {
                            self.getTrainingDatasets(self.featurestore);
                            self.getFeaturegroups(self.featurestore);
                            self.firstPull = true
                        }
                    },
                    function (error) {
                        growl.error(error.data.errorMsg, {
                            title: 'Failed to fetch list of featurestores',
                            ttl: 15000
                        });
                    }
                );
            };

            /**
             * Shows the modal for updating an existing feature group.
             *
             * @param featuregroup
             */
            self.updateFeaturegroup = function (featuregroup) {
                ModalService.updateFeaturegroup('lg', self.projectId, featuregroup, self.featurestore, self.jobs, self.trainingDatasets)
                    .then(
                        function (success) {
                            self.getFeaturegroups(self.featurestore);
                        }, function (error) {

                        });
            };

            /**
             * Shows the modal for updating an existing training dataset.
             *
             * @param trainingDataset
             */
            self.updateTrainingDataset = function (trainingDataset) {
                ModalService.updateTrainingDataset('lg', self.projectId, trainingDataset,
                    self.featurestore, self.jobs, self.trainingDatasets)
                    .then(
                        function (success) {
                            self.getTrainingDatasets(self.featurestore);
                        }, function (error) {
                        });
            };

            /**
             * Called when the delete-featuregroup-button is pressed
             *
             * @param featuregroup
             */
            self.deleteFeaturegroup = function (featuregroup) {
                ModalService.confirm('sm', 'Are you sure?',
                    'Are you sure that you want to delete this version of the feature group? ' +
                    'this action will delete all the data in the feature group with the selected version')
                    .then(function (success) {
                        FeaturestoreService.deleteFeaturegroup(self.projectId, self.featurestore, featuregroup.id).then(
                            function (success) {
                                self.getFeaturegroups(self.featurestore);
                                growl.success("Feature group deleted", {title: 'Success', ttl: 1000});
                            },
                            function (error) {
                                growl.error(error.data.errorMsg, {
                                    title: 'Failed to delete the feature group',
                                    ttl: 15000
                                });
                            });
                        growl.info("Deleting featuregroup... wait", {title: 'Deleting', ttl: 1000})
                    }, function (error) {
                        $uibModalInstance.close()
                    });
            };

            /**
             * Called when the delete-trainingDataset-button is pressed
             *
             * @param trainingDataset
             */
            self.deleteTrainingDataset = function (trainingDataset) {
                ModalService.confirm('sm', 'Are you sure?',
                    'Are you sure that you want to delete this version of the training dataset? ' +
                    'this action will delete all the data in the training dataset of this version together with its metadata')
                    .then(function (success) {
                        FeaturestoreService.deleteTrainingDataset(self.projectId, self.featurestore, trainingDataset.id).then(
                            function (success) {
                                self.getTrainingDatasets(self.featurestore)
                                growl.success("Training Dataset deleted", {title: 'Success', ttl: 1000});
                            },
                            function (error) {
                                growl.error(error.data.errorMsg, {
                                    title: 'Failed to delete the training dataset',
                                    ttl: 15000
                                });
                            });
                        growl.info("Deleting training dataset... wait", {title: 'Deleting', ttl: 1000})
                    }, function (error) {
                        $uibModalInstance.close()
                    });
            };

            /**
             * Called when the increment-version-featuregroup-button is pressed
             *
             * @param featuregroups list of featuregroup versions
             * @param versions list
             */
            self.newFeaturegroupVersion = function (featuregroups, versions) {
                var i;
                var maxVersion = -1;
                for (i = 0; i < versions.length; i++) {
                    if (versions[i] > maxVersion)
                        maxVersion = versions[i]
                }
                ModalService.createNewFeaturegroupVersion('lg', self.projectId, featuregroups[maxVersion], self.featurestore, self.jobs, self.featuregroups)
                    .then(
                        function (success) {
                            self.getFeaturegroups(self.featurestore);
                        }, function (error) {
                            growl.error(error.data.errorMsg, {
                                title: 'Failed to create a new version of the feature group',
                                ttl: 15000
                            });
                        });
            };

            /**
             * Called when the increment-version-trainingDataset-button is pressed
             *
             * @param trainingDatasets list of featuregroup versions
             * @param versions list
             */
            self.newTrainingDatasetVersion = function (trainingDatasets, versions) {
                var i;
                var maxVersion = -1;
                for (i = 0; i < versions.length; i++) {
                    if (versions[i] > maxVersion)
                        maxVersion = versions[i]
                }
                ModalService.createNewTrainingDatasetVersion('lg', self.projectId, trainingDatasets[maxVersion], self.featurestore, self.jobs, self.trainingDatasets)
                    .then(
                        function (success) {
                            self.getTrainingDatasets(self.featurestore);
                        }, function (error) {
                            growl.error(error.data.errorMsg, {
                                title: 'Failed to create a new version of the training dataset',
                                ttl: 15000
                            });
                        });
            };

            /**
             * Called when the clear-featuregroup-contents-button is pressed
             *
             * @param featuregroup
             */
            self.clearFeaturegroupContents = function (featuregroup) {
                ModalService.confirm('sm', 'Are you sure? This action will drop all data in the feature group',
                    'Are you sure that you want to delete the contents of this feature group? ' +
                    'If you want to keep the contents and write new data you can create a new version of the same feature group.')
                    .then(function (success) {
                        FeaturestoreService.clearFeaturegroupContents(self.projectId, self.featurestore, featuregroup).then(
                            function (success) {
                                self.getFeaturegroups(self.featurestore);
                                growl.success("Feature group contents cleared", {title: 'Success', ttl: 1000});
                            },
                            function (error) {
                                growl.error(error.data.errorMsg, {
                                    title: 'Failed to clear the featuregroup contents',
                                    ttl: 15000
                                });
                            }
                        );
                        growl.info("Clearing contents of the featuregroup... wait", {title: 'Clearing', ttl: 1000})
                    }, function (error) {

                    });
            };

            /**
             * Called when the view-featuregroup-statistics button is pressed
             *
             * @param featuregroup
             */
            self.viewFeaturegroupStatistics = function (featuregroup) {
                ModalService.viewFeaturegroupStatistics('lg', self.projectId, featuregroup).then(
                    function (success) {
                    }, function (error) {
                    });
            };

            /**
             * Called when the view-training-dataset-statistics button is pressed
             *
             * @param trainingDataset
             */
            self.viewTrainingDatasetStatistics = function (trainingDataset) {
                ModalService.viewTrainingDatasetStatistics('lg', self.projectId, trainingDataset).then(
                    function (success) {
                    }, function (error) {
                    });
            };

            /**
             * Helper function for redirecting to another project page
             *
             * @param serviceName project page
             */
            self.goToUrl = function (serviceName) {
                $location.path('project/' + self.projectId + '/' + serviceName);
            };

            /**
             * Called when the launch-job button is pressed
             */
            self.launchJob = function (jobName) {
                JobService.setJobFilter(jobName);
                self.goToUrl("jobs")
            };

            /**
             * Retrieves a list of all featuregroups for a given featurestore
             *
             * @param featurestore the featurestore to query
             */
            self.getFeaturegroups = function (featurestore) {
                FeaturestoreService.getFeaturegroups(self.projectId, featurestore).then(
                    function (success) {
                        self.featuregroups = success.data;
                        self.groupFeaturegroupsByVersion();
                        self.collectAllFeatures();
                        self.featuregroupsLoaded = true;
                        self.stopLoading()
                    },
                    function (error) {
                        self.featuregroupsLoaded = true;
                        self.stopLoading();
                        growl.error(error.data.errorMsg, {
                            title: 'Failed to fetch the featuregroups for the featurestore',
                            ttl: 15000
                        });
                    });
            };


            /**
             * Retrieves a list of all training datasets for a given featurestore
             *
             * @param featurestore the featurestore to query
             */
            self.getTrainingDatasets = function (featurestore) {
                FeaturestoreService.getTrainingDatasets(self.projectId, featurestore).then(
                    function (success) {
                        self.trainingDatasets = success.data;
                        self.groupTrainingDatasetsByVersion();
                        self.trainingDatasetsLoaded = true;
                        self.stopLoading()
                    },
                    function (error) {
                        self.trainingDatasetsLoaded = true;
                        self.stopLoading();
                        growl.error(error.data.errorMsg, {
                            title: 'Failed to fetch the training datasets for the featurestore',
                            ttl: 15000
                        });
                    });
            };

            /**
             * Helper to collect the features of all featuregroups in the featurestore into a
             * single list
             */
            self.collectAllFeatures = function () {
                var featuresTemp = [];
                var i;
                var j;
                for (i = 0; i < self.featuregroups.length; i++) {
                    var fgFeatures = [];
                    for (j = 0; j < self.featuregroups[i].features.length; j++) {
                        fgFeatures.push({
                            name: self.featuregroups[i].features[j].name,
                            type: self.featuregroups[i].features[j].type,
                            description: self.featuregroups[i].features[j].description,
                            primary: self.featuregroups[i].features[j].primary,
                            featuregroup: self.featuregroups[i].name,
                            date: self.featuregroups[i].created,
                            version: self.featuregroups[i].version,
                            idx: i + 1
                        })
                    }
                    featuresTemp = featuresTemp.concat(fgFeatures)
                }
                self.features = featuresTemp;
            };

            /**
             * Goes through a list of featuregroups and groups them by name so that you get name --> versions mapping
             */
            self.groupFeaturegroupsByVersion = function () {
                var dict = {};
                var i;
                var versionVar;
                for (i = 0; i < self.featuregroups.length; i++) {
                    if (self.featuregroups[i].name in dict) {
                        versionVar = self.featuregroups[i].version.toString();
                        dict[self.featuregroups[i].name][versionVar] = self.featuregroups[i]
                    } else {
                        versionVar = self.featuregroups[i].version.toString();
                        dict[self.featuregroups[i].name] = {};
                        dict[self.featuregroups[i].name][versionVar] = self.featuregroups[i]
                    }
                }
                var dictList = [];
                var item;
                for (var key in dict) {
                    item = {};
                    item.name = key;
                    item.versionToGroups = dict[key];
                    var versions = Object.keys(item.versionToGroups);
                    item.versions = versions;
                    item.activeVersion = versions[versions.length - 1];
                    item.type = "Feature Group"
                    dictList.push(item);
                }
                self.featuregroupsDictList = dictList
                self.featurestoreEntitiesDictList = self.featuregroupsDictList.concat(self.trainingDatasetsDictList)
            };

            /**
             * Goes through a list of training datasets and groups them by name so that you get name --> versions mapping
             */
            self.groupTrainingDatasetsByVersion = function () {
                var dict = {};
                var i;
                var versionVar;
                for (i = 0; i < self.trainingDatasets.length; i++) {
                    if (self.trainingDatasets[i].name in dict) {
                        versionVar = self.trainingDatasets[i].version.toString();
                        dict[self.trainingDatasets[i].name][versionVar] = self.trainingDatasets[i]
                    } else {
                        versionVar = self.trainingDatasets[i].version.toString();
                        dict[self.trainingDatasets[i].name] = {};
                        dict[self.trainingDatasets[i].name][versionVar] = self.trainingDatasets[i]
                    }
                }
                var dictList = [];
                var item;
                for (var key in dict) {
                    item = {};
                    item.name = key;
                    item.versionToGroups = dict[key];
                    var versions = Object.keys(item.versionToGroups);
                    item.versions = versions;
                    item.activeVersion = versions[versions.length - 1];
                    item.type = "Training Dataset"
                    dictList.push(item);
                }
                self.trainingDatasetsDictList = dictList
                self.featurestoreEntitiesDictList = self.featuregroupsDictList.concat(self.trainingDatasetsDictList)
            };

            /**
             * Opens the modal to view a featuregroup schema
             *
             * @param featuregroup
             */
            self.viewSchemaContent = function (featuregroup) {
                ModalService.viewFeatureSchemaContent('lg', self.projectId, featuregroup).then(
                    function (success) {
                    }, function (error) {
                    });
            };

            /**
             * Opens the modal to view a trainingDataset schema
             *
             * @param trainingDataset
             */
            self.viewTrainingDatasetSchemaContent = function (trainingDataset) {
                ModalService.viewTrainingDatasetSchemaContent('lg', self.projectId, trainingDataset).then(
                    function (success) {
                    }, function (error) {
                    });
            };


            /**
             * Opens the modal to view featuregroup information
             *
             * @param featuregroup
             */
            self.viewFeaturegroupInfo = function (featuregroup) {
                ModalService.viewFeaturegroupInfo('lg', self.projectId, featuregroup, self.featurestore, self.jobs).then(
                    function (success) {
                    }, function (error) {
                    });
            };

            /**
             * Opens the modal to view training dataset information
             *
             * @param trainingDataset
             */
            self.viewTrainingDatasetInfo = function (trainingDataset) {
                ModalService.viewTrainingDatasetInfo('lg', self.projectId, trainingDataset, self.featurestore, self.jobs).then(
                    function (success) {
                    }, function (error) {
                    });
            };

            /**
             * Opens the modal to preview featuregroup data
             *
             * @param featuregroup
             */
            self.previewFeaturegroup = function (featuregroup) {
                ModalService.previewFeaturegroup('lg', self.projectId, self.featurestore, featuregroup).then(
                    function (success) {
                    }, function (error) {
                    });
            };

            /**
             * Gets the feature store Quota from Hopsworks
             */
            self.getFeaturestoreQuota = function () {
                self.quotaLoaded = false
                ProjectService.get({}, {'id': self.projectId}).$promise.then(
                    function (success) {
                        self.quotas = success.quotas;
                        self.quotaLoaded = true
                        self.stopLoading()
                    }, function (error) {
                        self.quotaLoaded = true
                        self.stopLoading()
                        growl.error(error.data.errorMsg, {title: 'Failed to fetch featurestore quota', ttl: 15000});
                    }
                );
            }

            /**
             * Gets the featurestore HDFS usage (how many bytes of storage is being used)
             *
             * @returns {null if quota have not been fetched, otherwise the usage in a readable string}
             */
            self.featurestoreHdfsUsage = function () {
                if (self.quotas !== null) {
                    return convertSize(self.quotas.featurestoreHdfsUsageInBytes);
                }
                return null;
            };

            /**
             * Gets the featurestore HDFS quota (how many bytes of storage is allowed)
             *
             * @returns {null if quota have not been fetched, otherwise the quota in a readable string}
             */
            self.featurestoreHdfsQuota = function () {
                if (self.quotas !== null) {
                    return convertSize(self.quotas.featurestoreHdfsQuotaInBytes);
                }
                return null;
            };

            /**
             * Gets the featurestore files count (how many inodes are stored in the feature store)
             *
             * @returns {null if quota have not been fetched, otherwise the number of files}
             */
            self.featurestoreHdfsNsCount = function () {
                if (self.quotas !== null) {
                    return self.quotas.featurestoreHdfsNsCount;
                }
                return null;
            };

            /**
             * Gets the featurestore HDFS number of files quota (how many inodes is allowed in the featurestore)
             *
             * @returns {null if quota have not been fetched, otherwise the quota}
             */
            self.featurestoreHdfsNsQuota = function () {
                if (self.quotas !== null) {
                    return self.quotas.featurestoreHdfsNsQuota;
                }
                return null;
            };


            /**
             * Called when a new featurestore is selected in the dropdown list in the UI
             *
             * @param featurestore the selected featurestore
             */
            self.onSelectFeaturestoreCallback = function (featurestore) {
                self.startLoading("Loading Feature store data...");
                self.getTrainingDatasets(featurestore);
                self.getFeaturegroups(featurestore)
                self.featurestoreEntitiesDictList = self.featuregroupsDictList.concat(self.trainingDatasetsDictList)
            };

            /**
             * Called when a new feature group is selected in the dropdown list in the UI of feature search result
             *
             * @param featuregroupName the name of the selected featuregroup
             */
            self.onSelectFeaturegroupSearchResultCallback = function (featuregroupName) {
                for (var i = 0; i < self.featureSearchResultFeatures.length; i++) {
                    if (self.featureSearchResultFeatures[i].featuregroup == featuregroupName) {
                        self.featureSearchResult = self.featureSearchResultFeatures[i]
                        return
                    }
                }
            };


            /**
             * Initializes the UI by retrieving featurstores from the backend
             */
            self.init = function () {
                self.startLoading("Loading Feature store data...");
                self.getFeaturestores();
                self.getAllJobs();
                self.getFeaturestoreQuota();
            };

            /**
             * Called when clicking the link to featuregroup from the list of features. Switches the view to the
             * specific featuregroup
             *
             * @param featuregroupName the featuregroup to go to
             */
            self.goToFeaturegroup = function (featuregroupName) {
                self.fgFilter = featuregroupName;
            };


            /**
             * Gets all jobs for the project
             */
            self.getAllJobs = function () {
                var expansion = "&expand=executions(offset=0;limit=1;sort_by=id:desc)";
                JobService.getJobs(self.projectId, 0, 0, expansion).then(
                    function (success) {
                        self.jobs = success.data.items;
                        self.jobsLoaded = true
                        self.stopLoading();
                    }, function (error) {
                        self.jobsLoaded = true
                        self.stopLoading();
                        growl.error(error.data.errorMsg, {title: 'Failed to fetch jobs for the project', ttl: 15000});
                    });
            };

            /**
             * Set feature engineering jobs to show in the featurestore UI
             */
            self.setFeatureEngineeringJobs = function () {
                var matched_jobs = []
                for (var i = 0; i < self.jobs.length; i++) {
                    if (typeof self.jobs[i].executions.items !== 'undefined') {
                        self.jobs[i].state = self.jobs[i].executions.items[0].state;
                        self.jobs[i].finalStatus = self.jobs[i].executions.items[0].finalStatus;
                        self.jobs[i].progress = self.jobs[i].executions.items[0].progress;
                        self.jobs[i].duration = self.jobs[i].executions.items[0].duration;
                        self.jobs[i].submissionTime = self.jobs[i].executions.items[0].submissionTime;
                        var match = false
                        for (var j = 0; j < self.featuregroups.length; j++) {
                            if (self.jobs[i].name == self.featuregroups[j].jobName && (self.jobs[i].submissionTime !== 'undefined' && self.jobs[i].submissionTime !== null)) {
                                match = true
                                break;
                            }
                        }
                        if (!match) {
                            for (var j = 0; j < self.trainingDatasets.length; j++) {
                                if (self.jobs[i].name == self.trainingDatasets[j].jobName && (self.jobs[i].submissionTime !== 'undefined' && self.jobs[i].submissionTime !== null)) {
                                    match = true
                                    break;
                                }
                            }
                        }
                        if (match) {
                            matched_jobs.push(self.jobs[i])
                        }
                    }
                }
                matched_jobs.sort(function (a, b) {
                    // subtract dates
                    // to get a value that is either negative, positive, or zero.
                    a = new Date(a.submissionTime);
                    b = new Date(b.submissionTime);
                    return b - a
                });
                if (matched_jobs.length > self.numRecentFeJobs) {
                    self.fe_jobs = matched_jobs.slice(0, self.numRecentFeJobs)
                } else {
                    self.fe_jobs = matched_jobs
                }
            }

            /**
             * Get range of days for the featureProgressPlot
             *
             * @param startDate the startDate of the range
             * @param endDate the endDate of the range
             * @param dateFormat the format (string)
             * @param interval the inverval between the dates in the range
             * @param maxDays the max number of days in the range
             * @returns {*}
             */
            self.getDateRange = function (startDate, endDate, dateFormat, interval, maxDays) {
                var dates = []
                var end = moment(endDate)
                var start = moment(startDate)
                var diff = end.diff(start, 'days');
                if(!start.isValid() || !end.isValid() || diff <= 0) {
                    return dates;
                }
                dates.push({"formatted": start.format(dateFormat), "raw": start.toDate()});
                for(var i = 0; i < (diff/interval); i++) {
                    if(dates.length < maxDays){
                        dates.push({"formatted": start.add(interval,'d').format(dateFormat), "raw": start.toDate()});
                    }
                }

                if(dates.length > 0) {
                    dates[dates.length-1] = {"formatted": end.format(dateFormat), "raw": end.toDate()}
                }
                return dates;
            }

            /**
             * Convert bytes into bytes + suitable unit (e.g KB, MB, GB etc)
             *
             * @param fileSizeInBytes the raw byte number
             */
            self.sizeOnDisk = function (fileSizeInBytes) {
                return convertSize(fileSizeInBytes);
            };

            /**
             * Add version to featuregroup name
             *
             * @param featuregroupName the original featuregroup name
             * @param version the version
             * @returns the featuregroupVersionName
             */
            self.getFeaturegroupSelectName = function (featuregroupName, version) {
                return featuregroupName + "_" + version
            };

            /**
             * Get the API code to retrieve the feature
             */
            self.getCode = function (feature) {
                var codeStr = "from hops import featurestore\n"
                codeStr = codeStr + "featurestore.get_feature(\n"
                codeStr = codeStr + "'" + feature.name + "'"
                codeStr = codeStr + ",\nfeaturestore="
                codeStr = codeStr + "'" + self.featurestore.featurestoreName + "'"
                codeStr = codeStr + ",\nfeaturegroup="
                codeStr = codeStr + "'" + feature.featuregroup + "'"
                codeStr = codeStr + ",\nfeaturegroup_version="
                codeStr = codeStr + feature.version
                codeStr = codeStr + ")"
                return codeStr
            };

            /**
             * Format javascript date as string (YYYY-mm-dd HH:MM:SS)
             *
             * @param javaDate date to format
             * @returns {string} formatted string
             */
            $scope.formatDate = function (javaDate) {
                var d = new Date(javaDate);
                return d.getFullYear().toString() + "-" + ((d.getMonth() + 1).toString().length == 2 ? (d.getMonth() + 1).toString() : "0" + (d.getMonth() + 1).toString()) + "-" + (d.getDate().toString().length == 2 ? d.getDate().toString() : "0" + d.getDate().toString()) + " " + (d.getHours().toString().length == 2 ? d.getHours().toString() : "0" + d.getHours().toString()) + ":" + ((parseInt(d.getMinutes() / 5) * 5).toString().length == 2 ? (parseInt(d.getMinutes() / 5) * 5).toString() : "0" + (parseInt(d.getMinutes() / 5) * 5).toString()) + ":00";
            };

            /**
             * Called when the launch-job button is pressed
             */
            self.launchJob = function (jobName) {
                JobService.setJobFilter(jobName);
                self.goToUrl("jobs")
            };

            /**
             * Find featuregroup with a given name and version
             *
             * @param featuregroupName the name of the featuregroup
             * @param version the version of the featuergroup
             * @returns featuregroup
             */
            self.getFeaturegroupByNameAndVersion = function (featuregroupName, version) {
                for (var i = 0; i < self.featuregroups.length; i++) {
                    if (self.featuregroups[i].name == featuregroupName && self.featuregroups[i].version == version) {
                        return self.featuregroups[i]
                    }
                }
            };

            /**
             * Send async request to hopsworks to calculate the inode size of the featurestore
             * this can potentially be a long running operation if the directory is deeply nested
             */
            self.fetchFeaturestoreSize = function () {
                if (self.featurestoreSizeWorking) {
                    return
                }
                self.featurestoreSizeWorking = true
                var request = {id: self.projectId, type: "inode", inodeId: self.featurestore.inodeId};
                ProjectService.getMoreInodeInfo(request).$promise.then(function (success) {
                    self.featurestoreSizeWorking = false;
                    self.featurestoreSize = self.sizeOnDisk(success.size)
                }, function (error) {
                    growl.error(error.data.errorMsg, {title: 'Failed to fetch size of featurestore', ttl: 5000});
                    self.featurestoreSizeWorking = false;
                });
            };

            /**
             * Send async request to hopsworks to calculate the inode size of a feature group
             * this can potentially be a long running operation if the directory is deeply nested
             */
            self.fetchFeaturegroupSize = function (featuregroup) {
                if (self.featuregroupSizeWorking) {
                    return
                }
                self.featuregroupSizeWorking = true
                var request = {id: self.projectId, type: "inode", inodeId: featuregroup.inodeId};
                ProjectService.getMoreInodeInfo(request).$promise.then(function (success) {
                    self.featuregroupSizeWorking = false;
                    self.featuregroupSize = self.sizeOnDisk(success.size)
                }, function (error) {
                    growl.error(error.data.errorMsg, {title: 'Failed to fetch size of feature group', ttl: 5000});
                    self.featuregroupSizeWorking = false;
                });
            };

            /**
             * Calculate date interval for the featureProgressPlot
             *
             * @param numDates number of dates the plot should have
             * @param daysBetween daysbetween the first feature was inserted into the featurestore and the current date
             * @returns {the interval}
             */
            self.getDateInterval = function(numDates, daysBetween) {
                if(daysBetween <= numDates){
                    return 1
                } else {
                    return Math.floor(daysBetween/numDates)
                }
            }

            /**
             * Get days between two javascript dates
             *
             * @param date1
             * @param date2
             * @returns {number of days between}
             */
            self.daysBetween = function( date1, date2 ) {
                //Get 1 day in milliseconds
                var one_day=1000*60*60*24;

                // Convert both dates to milliseconds
                var date1_ms = date1.getTime();
                var date2_ms = date2.getTime();

                // Calculate the difference in milliseconds
                var difference_ms = date2_ms - date1_ms;

                // Convert back to days and return
                return Math.round(difference_ms/one_day);
            }

            /**
             * Calculates an estimate of the number of features in the featurestore at a specific date based on the
             * date the list of features were inserted/created.
             *
             * @param day the date to base the calculation on
             */
            self.getFeatureProgressChartCounts = function(day) {
                var count = 0
                for (var i = 0; i < self.features.length; i++) {
                    if(new Date(self.features[i].date) <= day) {
                        count = count + 1
                    }
                }
                return count
            }


            /**
             * Setups the configuration of the feature progress in the header in the featurestore UI
             */
            self.setupFeatureProgressChart = function() {
                var today = new Date()
                self.features.sort(function (a, b) {
                    // subtract dates
                    // to get a value that is either negative, positive, or zero.
                    a = new Date(a.submissionTime);
                    b = new Date(b.submissionTime);
                    return a - b
                });
                var daysLabels = []
                var daysValues = []
                if(self.features.length > 0) {
                    var daysBetween = self.daysBetween(new Date(self.features[0].date), today)
                    var interval = self.getDateInterval(self.numFeatureProgressChartDataPoints, daysBetween)
                    var days = self.getDateRange(new Date(self.features[0].date), today, "DD-MM-YY",
                        interval, self.numFeatureProgressChartDataPoints)
                    for (var i = 0; i < days.length; i++) {
                        daysLabels.push(days[i].formatted)
                        daysValues.push(self.getFeatureProgressChartCounts(days[i].raw))
                    }
                } else {
                    daysLabels.push(moment(new Date()))
                    daysValues.push(0)
                    for (var i = 0; i < self.numFeatureProgressChartDataPoints; i++) {
                        //daysLabels.push()
                    }
                }

                var featureProgressChartOptions = {
                    chart: {
                        height: 150,
                        type: 'line',
                        zoom: {
                            enabled: false
                        },
                        toolbar: {
                            show: false
                        }
                    },
                    yaxis: {
                        tickAmount: 2
                    },
                    dataLabels: {
                        enabled: false
                    },
                    stroke: {
                        curve: 'straight'
                    },
                    series: [{
                        name: "Features",
                        data: daysValues
                    }],
                    grid: {
                        row: {
                            colors: ['#f3f3f3', 'transparent'], // takes an array which will be repeated on columns
                            opacity: 0.5
                        },
                    },
                    xaxis: {
                        categories: daysLabels,
                        labels: {
                            rotate: -35,
                            rotateAlways: true
                        }
                    },
                    colors: ["#111"],
                }
                self.featureProgressChartOptions = featureProgressChartOptions
            }

            /**
             * Renders the feature progress chart on the div in the featurestore header with the id
             * "featureProgressChart"
             */
            self.renderFeatureProgressChart = function () {
                self.setupFeatureProgressChart();
                $("#headRow").ready(function () {
                    self.featureProgressChart = new ApexCharts(
                        document.querySelector("#featureProgressChart"),
                        self.featureProgressChartOptions
                    );
                    self.featureProgressChart.render();
                });
            }

            /**
             * Setups the configuration of the quota chart in the header in the featurestore UI
             */
            self.setupQuotaChart = function () {
                var quote = Math.round((self.quotas.featurestoreHdfsUsageInBytes / self.quotas.featurestoreHdfsQuotaInBytes)*100)
                var quotaChartOptions = {
                    chart: {
                        height: 175,
                        type: 'radialBar',
                    },
                    plotOptions: {
                        radialBar: {
                            hollow: {
                                size: '70%',
                                offsetY: -60,
                                offsetX: -200,
                            }
                        },
                    },
                    fill: {
                        colors: ['#111']
                    },
                    dataLabels: {
                        style: {
                            fontSize: '14px',
                            colors: ['#111']
                        }
                    },
                    stroke: {
                        lineCap: "round",
                    },
                    colors: ["#111"],
                    series: [quote],
                    labels: ['Quota'],
                }
                self.quotaChartOptions = quotaChartOptions
            }

            /**
             * Renders the featurestore quota chart on the div in the featurestore header with the id "quotaChart"
             */
            self.renderQuotaChart = function () {
                self.setupQuotaChart();
                $("#headRow").ready(function () {
                    self.quotaChart = new ApexCharts(
                        document.querySelector("#quotaChart"),
                        self.quotaChartOptions
                    );
                    self.quotaChart.render();
                });
            }

            /**
             * Check if a job of a featuregroup in the featurestore belongs to this project's jobs or another project
             *
             * @param jobId the jobId to lookup
             */
            self.isJobLocal = function (jobId) {
                var i;
                var jobFoundBool = false;
                for (i = 0; i < self.jobs.length; i++) {
                    if (self.jobs[i].id === jobId) {
                        jobFoundBool = true
                    }
                }
                return jobFoundBool
            };

            self.init()
        }
    ])
;
