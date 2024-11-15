const axios = require("axios");

async function getHotelDetails(hotel_id, destination_id) {
  const baseUrl = "https://5f2be0b4ffc88500167b85a0.mockapi.io/suppliers/";

  try {
    // Make parallel requests to the three suppliers not seqsequential each request
    // => Reduce the total time taken to fetch all data
    const [acmeResponse, patagoniaResponse, paperfliesResponse] =
      await Promise.all([
        axios.get(`${baseUrl}acme`, {
          params: { Id: hotel_id, DestinationId: destination_id },
        }), // Acme API

        axios.get(`${baseUrl}patagonia`, {
          params: { id: hotel_id, destination: destination_id },
        }), // Patagonia API

        axios.get(`${baseUrl}paperflies`, {
          params: { hotel_id, destination_id },
        }), // Paperflies API
      ]);

    const acmeData = acmeResponse.data?.[0] || {};
    const patagoniaData = patagoniaResponse.data?.[0] || {};
    const paperfliesData = paperfliesResponse.data?.[0] || {};

   /*  const acmeData =
      acmeResponse.data.find(
        (item) => item.Id === hotel_id && item.DestinationId === destination_id,
      ) || {};
    const patagoniaData =
      patagoniaResponse.data.find(
        (item) => item.id === hotel_id && item.destination === destination_id,
      ) || {};
    const paperfliesData =
      paperfliesResponse.data.find(
        (item) =>
          item.hotel_id === hotel_id && item.destination_id === destination_id,
      ) || {}; */

    const normalizeData = (acmeData, patagoniaData, paperfliesData) => {
      return {
        hotel_id:
          acmeData.Id.trim() ||
          patagoniaData.id.trim() ||
          paperfliesData.hotel_id.trim(),
        destination_id:
          acmeData?.DestinationId ||
          patagoniaData?.destination ||
          paperfliesData?.destination_id,
        name:
          acmeData?.Name.trim() ||
          patagoniaData?.name.trim() ||
          paperfliesData?.hotel_name.trim(),
        latitude: acmeData?.Latitude || patagoniaData?.lat,
        longitude: acmeData?.Longitude || patagoniaData?.lng,
        address:
          acmeData?.Address.trim() ||
          patagoniaData?.address.trim() ||
          paperfliesData?.location?.address.trim(),
        city: acmeData?.City.trim(),
        country:
          paperfliesData?.location?.country.trim() || acmeData?.Country.trim(),
        description: paperfliesData?.details.trim(), //***
        amenitiesGeneral: paperfliesData?.amenities?.general, //***
        amenitiesRoom: paperfliesData?.amenities?.room, //***
        imagesRooms:
          patagoniaData?.images?.rooms.map((room) => ({
            link: room.url.trim(),
            description: room.description.trim(),
          })) ||
          paperfliesData?.images?.rooms.map((room) => ({
            link: room.link.trim(),
            description: room.caption.trim(),
          })),
        imageSite: paperfliesData?.images?.site.map((site) => ({
          link: site.link.trim(),
          description: site.caption.trim(),
        })), //***
        imageAmenities: patagoniaData?.images?.amenities.map((amenities) => ({
          link: amenities.url.trim(),
          description: amenities.description.trim(),
        })),
        booking_conditions: paperfliesData?.booking_conditions,
      };
    };

    /* console.log("Acme Data:", JSON.stringify(acmeData, null, 2));
    console.log("Patagonia Data:", JSON.stringify(patagoniaData, null, 2));
    console.log("Paperflies Data:", JSON.stringify(paperfliesData, null, 2)); */

    // Normalize the data from each supplier
    const normalizedAcmeData = normalizeData(
      acmeData,
      patagoniaData,
      paperfliesData,
    );
    const normalizedPatagoniaData = normalizeData(
      acmeData,
      patagoniaData,
      paperfliesData,
    );
    const normalizedPaperfliesData = normalizeData(
      acmeData,
      patagoniaData,
      paperfliesData,
    );

    // Merge the data with a consistent field naming
    const mergedData = {
      id:
        normalizedAcmeData.hotel_id ||
        normalizedPatagoniaData.hotel_id ||
        normalizedPaperfliesData.hotel_id,
      destination_id:
        normalizedAcmeData.destination_id ||
        normalizedPatagoniaData.destination_id ||
        normalizedPaperfliesData.destination_id,
      name:
        normalizedAcmeData.name ||
        normalizedPatagoniaData.name ||
        normalizedPaperfliesData.name,
      location: {
        lat: normalizedAcmeData.latitude || normalizedPatagoniaData.latitude,
        lng: normalizedAcmeData.longitude || normalizedPatagoniaData.longitude,
        address:
          normalizedAcmeData.address ||
          normalizedPatagoniaData.address ||
          normalizedPaperfliesData.address,
        city: normalizedAcmeData.city,
        country: normalizedAcmeData.country || normalizedPaperfliesData.country,
      },
      description: normalizedPaperfliesData.description,
      amenities: {
        general: normalizedPaperfliesData.amenitiesGeneral,
        room: normalizedPaperfliesData.amenitiesRoom,
      },
      images: {
        rooms:
          normalizedPatagoniaData.imagesRooms ||
          normalizedPaperfliesData.imagesRooms,
        site: normalizedPaperfliesData.imageSite,
        amenities: normalizedPatagoniaData.imageAmenities,
      },
      booking_conditions: normalizedPaperfliesData.booking_conditions,
    };

    // Return the merged data
    return mergedData;
  } catch (error) {
    console.error("Error fetching hotel details:", error);
    throw error; // Re-throw the error for proper handling
  }
}

// Example usage:
(async () => {
  const hotel_id = "iJhz"; // Use 'hotel_id'
  const destination_id = "5432"; // Use 'destination_id'

  // Initialize an array to store hotel details
  const hotelDetailsArray = [];

  try {
    const hotelDetails = await getHotelDetails(hotel_id, destination_id);
    hotelDetailsArray.push(hotelDetails);

    console.log(JSON.stringify(hotelDetailsArray, null, 2));
  } catch (error) {
    console.error("Error retrieving hotel details:", error);
  }
})();
