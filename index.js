const axios = require("axios");

async function getHotelDetails(hotel_ids, destination_ids) {
  const baseUrl = "https://5f2be0b4ffc88500167b85a0.mockapi.io/suppliers";

  try {
    // Make parallel requests to the three suppliers
    const [acmeResponse, patagoniaResponse, paperfliesResponse] =
      await Promise.all([
        axios.get(`${baseUrl}/acme`),
        axios.get(`${baseUrl}/patagonia`),
        axios.get(`${baseUrl}/paperflies`),
      ]);

    // Convert arrays into objects based on hotel_id and destination_id
    const acmeDataObj = acmeResponse.data.reduce((acc, item) => {
      acc[`${item.Id}-${item.DestinationId}`] = item;
      return acc;
    }, {});

    const patagoniaDataObj = patagoniaResponse.data.reduce((acc, item) => {
      acc[`${item.id}-${item.destination}`] = item;
      return acc;
    }, {});

    const paperfliesDataObj = paperfliesResponse.data.reduce((acc, item) => {
      acc[`${item.hotel_id}-${item.destination_id}`] = item;
      return acc;
    }, {});

    // Normalize the data from each supplier
    const normalizeData = (acmeData, patagoniaData, paperfliesData) => {
      return {
        hotel_id:
          acmeData.Id?.trim() ||
          patagoniaData.id?.trim() ||
          paperfliesData.hotel_id?.trim(),
        destination_id:
          acmeData.DestinationId ||
          patagoniaData.destination ||
          paperfliesData.destination_id,
        name:
          acmeData.Name?.trim() ||
          patagoniaData.name?.trim() ||
          paperfliesData.hotel_name?.trim(),
        latitude: acmeData.Latitude || patagoniaData.lat,
        longitude: acmeData.Longitude || patagoniaData.lng,
        address:
          acmeData.Address?.trim() ||
          patagoniaData.address?.trim() ||
          paperfliesData.location?.address?.trim(),
        city: acmeData.City?.trim(),
        country:
          paperfliesData.location?.country?.trim() || acmeData.Country?.trim(),
        description: paperfliesData.details?.trim(),
        amenitiesGeneral: paperfliesData.amenities?.general,
        amenitiesRoom: paperfliesData.amenities?.room,
        imagesRooms: (
          patagoniaData.images?.rooms || paperfliesData.images?.rooms
        )?.map((room) => ({
          link: room.url?.trim() || room.link?.trim(),
          description: room.description?.trim() || room.caption?.trim(),
        })),
        imagesSite: paperfliesData.images?.site?.map((site) => ({
          link: site.link?.trim(),
          description: site.caption?.trim(),
        })),
        imagesAmenities: patagoniaData.images?.amenities?.map((amenities) => ({
          link: amenities.url?.trim(),
          description: amenities.description?.trim(),
        })),
        booking_conditions: paperfliesData.booking_conditions,
      };
    };

    // Function to merge data and create a structured format
    const mergedData = (acmeData, patagoniaData, paperfliesData) => {
      const standardizedData = normalizeData(
        acmeData,
        patagoniaData,
        paperfliesData
      );

      // Check if the data is valid (not empty)
      if (!standardizedData.hotel_id || !standardizedData.destination_id) {
        return null; // Skip if critical fields are missing
      }

      return {
        id: standardizedData.hotel_id,
        destination_id: standardizedData.destination_id,
        name: standardizedData.name,
        location: {
          lat: standardizedData.latitude,
          lng: standardizedData.longitude,
          address: standardizedData.address,
          city: standardizedData.city,
          country: standardizedData.country,
        },
        description: standardizedData.description,
        amenities: {
          general: standardizedData.amenitiesGeneral,
          room: standardizedData.amenitiesRoom,
        },
        images: {
          rooms: standardizedData.imagesRooms,
          site: standardizedData.imagesSite,
          amenities: standardizedData.imagesAmenities,
        },
        booking_conditions: standardizedData.booking_conditions,
      };
    };

    // Combine hotel_ids and destination_ids into pairs
    const combinationKeyPairs =
      hotel_ids && destination_ids
        ? hotel_ids.flatMap((hotel_id) =>
            destination_ids.map((destination_id) => ({
              hotel_id,
              destination_id,
            }))
          )
        : [];

    // Loop through the combinations of hotel_id and destination_id
    const hotelDetailsArray = [];

    console.log(`combinationKeyPairs.length: ${combinationKeyPairs.length}`);
    console.log(`hotel_ids: ${hotel_ids}`);
    console.log(`args[0]: ${args[0]}`);
    console.log(`destination_ids: ${destination_ids}`);
    console.log(`args[1]: ${args[1]}`);
    console.log(
      `Without Hotel ID and Destination ID <=> (!hotel_ids && !destination_ids): ${
        !hotel_ids && !destination_ids
      }`
    );
    console.log(
      `With Hotel ID and Destination ID <=> !!hotel_ids && !!destination_ids: ${
        !!hotel_ids && !!destination_ids
      }`
    );
    console.log(
      `Without Hotel ID and With Destination ID <=> !hotel_ids && !!destination_ids: ${
        !hotel_ids && !!destination_ids
      }`
    );
    console.log(
      `With Hotel ID and Without Destination ID <=> !!hotel_ids && !destination_ids: ${
        !!hotel_ids && !destination_ids
      }`
    );

    // Without Hotel ID and Destination ID => Return all hotels
    if (!hotel_ids && !destination_ids) {
      // Push all data from all suppliers (this handles both hotel_ids and destination_ids being undefined)
      const allHotels = [
        ...acmeResponse.data,
        ...patagoniaResponse.data,
        ...paperfliesResponse.data,
      ];

      // console.log(`allHotels: ${JSON.stringify(allHotels, null, 2)}`);

      // Ensure each hotel is only added once based on the hotel_id-destination_id combination.
      const uniqueHotels = new Set();

      // Inside the loop that processes all hotels:
      allHotels.forEach(({ hotel_id, destination_id }) => {
        // Check if the hotel_id and destination_id are valid
        if (hotel_id && destination_id) {
          const key = `${hotel_id}-${destination_id}`;

          if (!uniqueHotels.has(key)) {
            uniqueHotels.add(key);

            console.log(`\nhotel_id: ${hotel_id}`);
            console.log(`destination_id: ${destination_id}\n`);

            console.log(`key: ${key}`);

            // Retrieve the data using these keys
            const acmeData = acmeDataObj[key] || {};
            const patagoniaData = patagoniaDataObj[key] || {};
            const paperfliesData = paperfliesDataObj[key] || {};

            // Create the merged data object
            const hotelMergedData = mergedData(
              acmeData,
              patagoniaData,
              paperfliesData
            );

            // Skip adding to the final array if mergedData returns null (empty data)
            if (hotelMergedData) {
              hotelDetailsArray.push(hotelMergedData);
            }
          }
        }
      });
    }
    // With Hotel ID and Destination ID => Return hotels based on the specific Hotel ID and Destination ID
    else if (!!hotel_ids && !!destination_ids) {
      combinationKeyPairs.forEach(({ hotel_id, destination_id }) => {
        const key = `${hotel_id}-${destination_id}`;

        const acmeData = acmeDataObj[key] || {};
        const patagoniaData = patagoniaDataObj[key] || {};
        const paperfliesData = paperfliesDataObj[key] || {};

        console.log(`key: ${key}`);

        /* console.log(`acmeData of ${hotel_id}-${destination_id}: ${JSON.stringify(acmeData, null, 2)}`);
        console.log(`patagoniaData of ${hotel_id}-${destination_id}: ${JSON.stringify(patagoniaData, null, 2)}`);
        console.log(`paperfliesData of ${hotel_id}-${destination_id}: ${JSON.stringify(paperfliesData, null, 2)}`); */

        // Create the merged data object
        const hotelMergedData = mergedData(
          acmeData,
          patagoniaData,
          paperfliesData
        );

        // Skip adding to the final array if mergedData returns null (empty data)
        if (hotelMergedData) {
          hotelDetailsArray.push(hotelMergedData);
        }
      });
    } else if (!hotel_ids || !destination_ids) {
      // Without Hotel ID or Without Destination ID => Return an empty array
      return [];
    }

    // Return the array of all matching hotels
    return hotelDetailsArray;
  } catch (error) {
    console.error("Error fetching hotels data:", error);
    throw error;
  }
}

// Get command-line arguments
const args = process.argv.slice(2);

// Parse arguments and convert them to arrays, handling 'none' case
let hotel_ids = args[0] === "none" || !args[0] ? [] : args[0].split(",");
let destination_ids = args[1] === "none" || !args[1] ? [] : args[1].split(",");

hotel_ids = !hotel_ids.length ? undefined : hotel_ids;
destination_ids = !destination_ids.length ? undefined : destination_ids;

// Example usage with command-line arguments
(async () => {
  try {
    const hotelDetailsArray = await getHotelDetails(hotel_ids, destination_ids);

    console.log(JSON.stringify(hotelDetailsArray, null, 2));
  } catch (error) {
    console.error("Error retrieving hotel details:", error);
  }
})();
