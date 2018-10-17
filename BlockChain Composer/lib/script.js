/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* global getFactory getAssetRegistry getParticipantRegistry emit */

// MANUFACTURER FUNCTIONS
/**
 * Place an request for a container
 * @param {org.acme.container_network.PlaceRequest} placeRequest - the PlaceRequest transaction
 * @transaction
 */
async function placeRequest(requestRequest) { // eslint-disable-line no-unused-vars
    console.log('placeRequest');

    const factory = getFactory();
    const namespace = 'org.acme.container_network';

    const request = factory.newResource(namespace, 'Request', requestRequest.requestId);
    request.containerDetails = requestRequest.containerDetails;
    request.requestStatus = 'PLACED';
    request.requester = factory.newRelationship(namespace, 'Producer', requestRequest.requester.getIdentifier());
    request.options = requestRequest.options;

    // save the request
    const assetRegistry = await getAssetRegistry(request.getFullyQualifiedType());
    await assetRegistry.add(request);

    // emit the event
    const placeRequestEvent = factory.newEvent(namespace, 'PlaceRequestEvent');
    placeRequestEvent.requestId = request.requestId;
    placeRequestEvent.containerDetails = request.containerDetails;
    placeRequestEvent.location = request.location;
    placeRequestEvent.requester = request.requester;
    emit(placeRequestEvent);
}

/**
 * Update the status of an request
 * @param {org.acme.container_network.UpdateRequestStatus} updateRequestStatus - the UpdateRequestStatus transaction
 * @transaction
 */
async function updateRequestStatus(updateRequest) { // eslint-disable-line no-unused-vars
    console.log('updateRequestStatus');

    const factory = getFactory();
    const namespace = 'org.acme.container_network';

    // get container registry
    const containerRegistry = await getAssetRegistry(namespace + '.Container');
    if (updateRequest.requestStatus === 'VIN_ASSIGNED') {
        if (!updateRequest.vin) {
            throw new Error('Value for VIN was expected');
        }
        // create a container
        const container = factory.newResource(namespace, 'Container', updateRequest.vin );
        container.containerDetails = updateRequest.request.containerDetails;
        container.containerStatus = 'AVAILABLE';
        await containerRegistry.add(container);
    } else if(updateRequest.requestStatus === 'TRANSPORTER_ASSIGNED') {
        if (!updateRequest.vin) {
            throw new Error('Value for VIN was expected');
        }

        // assign the owner of the container to be the producer who placed the request
        const container = await containerRegistry.get(updateRequest.vin);
        container.containerStatus = 'ACTIVE';
        // TODO owner aanpassen
        container.owner = factory.newRelationship(namespace, 'Transporter', updateRequest.request.requester.username);
        await containerRegistry.update(container);
    }

    // update the request
    const request = updateRequest.request;
    request.requestStatus = updateRequest.requestStatus;
    const requestRegistry = await getAssetRegistry(namespace + '.Request');
    await requestRegistry.update(request);

    // emit the event
    const updateRequestStatusEvent = factory.newEvent(namespace, 'UpdateRequestStatusEvent');
    updateRequestStatusEvent.requestStatus = updateRequest.request.requestStatus;
    updateRequestStatusEvent.request = updateRequest.request;
    emit(updateRequestStatusEvent);
}

// DEMO SETUP FUNCTIONS
/**
 * Create the participants to use in the demo
 * @param {org.acme.container_network.SetupDemo} setupDemo - the SetupDemo transaction
 * @transaction
 */
async function setupDemo() { // eslint-disable-line no-unused-vars
    console.log('setupDemo');

    const factory = getFactory();
    const namespace = 'org.acme.container_network';

    let people = ['Paul', 'Andy', 'Hannah', 'Sam', 'Caroline', 'Matt', 'Fenglian', 'Mark', 'James', 'Dave', 'Rob', 'Kai', 'Ellis', 'LesleyAnn'];
    let manufacturers;

    const containers = {
        'Arium': {
            'Nova': [
                {
                    'vin': 'ea290d9f5a6833a65',
                    'colour': 'Royal Purple',
                    'containerStatus': 'ACTIVE'
                }
            ],
            'Nebula': [
                {
                    'vin': '39fd242c2bbe80f11',
                    'colour': 'Statement Blue',
                    'containerStatus': 'ACTIVE'
                }
            ]
        },
        'Morde': {
            'Putt': [
                {
                    'vin': '835125e50bca37ca1',
                    'colour': 'Black',
                    'containerStatus': 'ACTIVE'
                },
                {
                    'vin': '0812e6d8d486e0464',
                    'colour': 'Red',
                    'containerStatus': 'ACTIVE'
                },
                {
                    'vin': 'c4aa418f26d4a0403',
                    'colour': 'Silver',
                    'containerStatus': 'ACTIVE'
                }
            ],
            'Pluto': [
                {
                    'vin': '7382fbfc083f696e5',
                    'colour': 'White',
                    'containerStatus': 'ACTIVE'
                },
                {
                    'vin': '01a9cd3f8f5db5ef7',
                    'colour': 'Green',
                    'containerStatus': 'ACTIVE'
                },
                {
                    'vin': '97f305df4c2881e71',
                    'colour': 'Grey',
                    'containerStatus': 'ACTIVE'
                }
            ]
        },
        'Ridge': {
            'Cannon': [
                {
                    'vin': 'af462063fb901d0e6',
                    'colour': 'Red',
                    'containerStatus': 'ACTIVE'
                },
                {
                    'vin': '3ff3395ecfd38f787',
                    'colour': 'White',
                    'containerStatus': 'ACTIVE'
                },
                {
                    'vin': 'de701fcf2a78d8086',
                    'colour': 'Silver',
                    'containerStatus': 'ACTIVE'
                }
            ],
            'Rancher': [
                {
                    'vin': '2fcdd7b5131e81fd0',
                    'colour': 'Blue',
                    'containerStatus': 'ACTIVE'
                },
                {
                    'vin': '79540e5384c970321',
                    'colour': 'White',
                    'containerStatus': 'ACTIVE'
                }
            ]
        }
    };

    // convert array names of people to be array of participant resources of type Producer with identifier of that name
    people = people.map(function (producer) {
        return factory.newResource(namespace, 'Producer', producer);
    });

    // create array of Manufacturer particpant resources identified by the top level keys in containers const
    manufacturers = Object.keys(containers).map(function (manufacturer) {
        const manufacturerResource = factory.newResource(namespace, 'Manufacturer', manufacturer);
        manufacturerResource.name = manufacturer;
        return manufacturerResource;
    });

    // create a Regulator participant resource
    const regulator = factory.newResource(namespace, 'Regulator', 'VDA');
    regulator.name = 'VDA';

    // add the regulator
    const regulatorRegistry = await getParticipantRegistry(namespace + '.Regulator');
    await regulatorRegistry.add(regulator);

    // add the manufacturers
    const manufacturerRegistry = await getParticipantRegistry(namespace + '.Manufacturer');
    await manufacturerRegistry.addAll(manufacturers);

    // add the producers
    const producerRegistry = await getParticipantRegistry(namespace + '.Producer');
    await producerRegistry.addAll(people);

    // add the containers
    const containerRegistry = await getAssetRegistry(namespace + '.Container');
    const containerResources = [];

    for (const manufacturer in containers) {
        for (const model in containers[manufacturer]) {
            const vehicconstemplatesForModel = containers[manufacturer][model];
            vehicconstemplatesForModel.forEach(function(vehicconstemplate) {
                const container = factory.newResource(namespace, 'Container', vehicconstemplate.vin);
                container.owner = people[containerResources.length+1];
                container.containerStatus = vehicconstemplate.containerStatus;
                container.containerDetails = factory.newConcept(namespace, 'ContainerDetails');
                container.containerDetails.make = factory.newResource(namespace, 'Manufacturer', manufacturer);
                container.containerDetails.modelType = model;
                container.containerDetails.colour = vehicconstemplate.colour;

                containerResources.push(container);
            });
        }
    }
    await containerRegistry.addAll(containerResources);
}