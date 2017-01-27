#!/bin/bash
# Deploy the frontend to the glassfish home directory and run bower
export PORT=2222
export WEBPORT=8080
export SERVER=localhost
export key=private_key
usr=jdowling
basedir=/srv/hops/domain1

scp ${usr}@${SERVER}:/home/${usr}/NetBeansProjects/hopsworks-chef/.vagrant/machines/default/virtualbox/private_key .  
ssh -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no -o IdentitiesOnly=yes -i $key -p $PORT vagrant@${SERVER} "cd ${basedir} && sudo chown -R glassfish:vagrant docroot && sudo chmod -R 775 *"

scp -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no -o IdentitiesOnly=yes -i $key -P ${PORT} -r ../hopsworks-web/yo/app/ vagrant@${SERVER}:${basedir}/docroot
scp -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no -o IdentitiesOnly=yes -i $key -P ${PORT} ../yo/bower.json vagrant@${SERVER}:${basedir}/docroot/app

ssh -o UserKnownHostsFile=/dev/null -o StrictHostKeyChecking=no -o IdentitiesOnly=yes -i $key -p $PORT vagrant@${SERVER} "cd ${basedir}/docroot/app && bower install && perl -pi -e \"s/getLocationBase\(\)/'http:\/\/${SERVER}:${WEBPORT}\/hopsworks-web-0.1.0'/g\" scripts/services/RequestInterceptorService.js"

google-chrome -new-tab http://${SERVER}:$WEBPORT/app
