const axios = require("axios");

const BASE_URL = "https://5f2be0b4ffc88500167b85a0.mockapi.io/suppliers";

const fetchSupplierData = async () => {
  const endpoints = ["acme", "patagonia", "paperflies"];
  const requests = endpoints.map((endpoint) =>
    axios.get(`${BASE_URL}/${endpoint}`)
  );

  const [acmeResponse, patagoniaResponse, paperfliesResponse] =
    await Promise.all(requests);

  return {
    acme: acmeResponse.data,
    patagonia: patagoniaResponse.data,
    paperflies: paperfliesResponse.data,
  };
};

const convertToDataObjects = (data, hotelIdKey, destinationIdKey) => {
  return data.reduce((acc, item) => {
    const key = `${item[hotelIdKey]}-${item[destinationIdKey]}`;
    acc[key] = item;
    return acc;
  }, {});
};

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

const formatData = (acmeData, patagoniaData, paperfliesData) => {
  const standardizedData = normalizeData(
    acmeData,
    patagoniaData,
    paperfliesData
  );
  if (!standardizedData.hotel_id || !standardizedData.destination_id) {
    return null;
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

const normalizeAllHotels = (
  allHotels,
  acmeDataObj,
  patagoniaDataObj,
  paperfliesDataObj
) => {
  return allHotels
    .map(({ hotel_id, destination_id }) => {
      if (!hotel_id || !destination_id) return null;

      const key = `${hotel_id}-${destination_id}`;

      const acmeData = acmeDataObj[key] || {};
      const patagoniaData = patagoniaDataObj[key] || {};
      const paperfliesData = paperfliesDataObj[key] || {};

      return normalizeData(acmeData, patagoniaData, paperfliesData);
    })
    .filter(Boolean);
};

const getHotelDetails = async (hotel_ids, destination_ids) => {
  try {
    const { acme, patagonia, paperflies } = await fetchSupplierData();

    const acmeDataObj = convertToDataObjects(acme, "Id", "DestinationId");

    const patagoniaDataObj = convertToDataObjects(
      patagonia,
      "id",
      "destination"
    );

    const paperfliesDataObj = convertToDataObjects(
      paperflies,
      "hotel_id",
      "destination_id"
    );

    const allHotels = [...acme, ...patagonia, ...paperflies];

    const allHotelsNormalized = normalizeAllHotels(
      allHotels,
      acmeDataObj,
      patagoniaDataObj,
      paperfliesDataObj
    );

    const uniqueHotels = new Set();
    const hotelDetailsArray = [];

    const combinationKeyPairs =
      hotel_ids && destination_ids
        ? hotel_ids.flatMap((hotel_id) =>
            destination_ids.map((destination_id) => ({
              hotel_id,
              destination_id,
            }))
          )
        : [];

    const addHotelDataWithKey = (key) => {
      if (!uniqueHotels.has(key)) {
        uniqueHotels.add(key);

        const acmeData = acmeDataObj[key] || {};
        const patagoniaData = patagoniaDataObj[key] || {};
        const paperfliesData = paperfliesDataObj[key] || {};

        const hotelMergedData = formatData(
          acmeData,
          patagoniaData,
          paperfliesData
        );

        if (hotelMergedData) hotelDetailsArray.push(hotelMergedData);
      }
    };

    // Case 1: No hotel IDs and no destination IDs provided - return all hotels
    if (!hotel_ids && !destination_ids) {
      allHotelsNormalized.forEach(({ hotel_id, destination_id }) => {
        if (hotel_id && destination_id)
          addHotelDataWithKey(`${hotel_id}-${destination_id}`);
      });
    }
    // Case 2: Both hotel IDs and destination IDs provided
    else if (!!hotel_ids && !!destination_ids) {
      combinationKeyPairs.forEach(({ hotel_id, destination_id }) =>
        addHotelDataWithKey(`${hotel_id}-${destination_id}`)
      );
    }
    // Case 3: hotel_ids are provided and no destination_ids
    else if (!!hotel_ids && !destination_ids) {
      hotel_ids.forEach((hotel_id) => {
        allHotelsNormalized.forEach((hotel) => {
          if (hotel.hotel_id === hotel_id)
            addHotelDataWithKey(`${hotel_id}-${hotel.destination_id}`);
        });
      });
    }
    // Case 4: destination_ids are provided and no hotel_ids
    else if (!!destination_ids && !hotel_ids) {
      destination_ids.forEach((destination_id) => {
        allHotelsNormalized.forEach((hotel) => {
          if (hotel.destination_id === destination_id)
            addHotelDataWithKey(`${hotel.hotel_id}-${destination_id}`);
        });
      });
    }

    return hotelDetailsArray;
  } catch (error) {
    console.error("Error fetching hotels data:", error);
    throw error;
  }
};

// Parse command-line arguments
const args = process.argv.slice(2);
const hotel_ids =
  args[0] === "none" || !args[0] ? undefined : args[0].split(",").map(String);
const destination_ids =
  args[1] === "none" || !args[1] ? undefined : args[1].split(",").map(Number);

// Example usage with command-line arguments
(async () => {
  try {
    const hotelDetailsArray = await getHotelDetails(hotel_ids, destination_ids);
    console.log(JSON.stringify(hotelDetailsArray, null, 2));
  } catch (error) {
    console.error("Error retrieving hotel details:", error);
  }
})();
