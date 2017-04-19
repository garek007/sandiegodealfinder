<?php

namespace Drupal\get_venues\Controller;

use Drupal\Core\Controller\ControllerBase;
use Drupal\Core\Database\Connection;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use \stdClass;

class GetVenuesController extends ControllerBase {

  /**
   * Display the markup.
   *
   * @return array
   */




  public function content(Request $request)
  {
    //node9 sends ajax request to here and sends zipcode
    $postal_code = $request->request->get('userZipcode');
    //$postal_code = 92101;
    //get users location in latitude and longitude
    $curLat = $request->request->get('userLat');//32.717925
    $curLng = $request->request->get('userLng');//-117.157992
    $radius = $request->request->get('radius');
    $day = $request->request->get('day');//id is 9, Tuesday
    $day += 7;//we add 7 so it matches the database tid (Taxonomy term id)
    //get today's day of week, we'll need it to pull relevant deals for today
    //pull all venues in database with same zipcode

      /*
          $getDeals = 'SELECT entity_id,field_deal_summary_value FROM {node__field_deal_summary} WHERE entity_id IN ( SELECT entity_id FROM {node__field_venue} WHERE field_venue_target_id = 11)';

    SELECT field_deal_summary_value FROM node__field_deal_summary WHERE entity_id IN ( SELECT entity_id FROM node__field_venue WHERE field_venue_target_id = 11)

      SELECT t_nod.title,
        t_nod.nid,
    t_lat.field_latitude_value,
        t_lng.field_longitude_value,
       t_add.field_street_address_value
      FROM node_field_data AS t_nod
      JOIN node__field_latitude AS t_lat
      ON t_lat.entity_id = t_nod.nid
      JOIN node__field_longitude AS t_lng
      ON t_lng.entity_id = t_nod.nid
      JOIN node__field_street_address
      AS t_add
      ON t_add.entity_id = t_nod.nid
      JOIN node__field_postal_code
      AS t_zip
      ON t_zip.entity_id = t_nod.nid
      WHERE t_zip.field_postal_code_value = 92110

      */

    $db = \Drupal::database();

    $result = $db->query('SELECT node.title, node.nid, latitude.field_latitude_value, longitude.field_longitude_value, address.field_street_address_value, phone.field_phone_value '.
    'FROM {node_field_data} AS node '.
    'JOIN {node__field_latitude} AS latitude ON latitude.entity_id = node.nid '.
    'JOIN {node__field_longitude} AS longitude ON longitude.entity_id = node.nid '.
    'JOIN {node__field_street_address} AS address ON address.entity_id = node.nid '.
    'JOIN {node__field_phone} AS phone ON phone.entity_id = node.nid '.
    'JOIN {node__field_postal_code} AS zipcode '.
    'ON zipcode.entity_id = node.nid '.
    'WHERE zipcode.field_postal_code_value = '.$postal_code);

    $venues = array();

    if ($result) {
      while ($row = $result->fetchAssoc()) {

        $venue = new stdClass();
        $venue->name = $row['title'];
        $venue->street = $row['field_street_address_value'];
        $venue->lat = (float)$row['field_latitude_value'];
        $venue->lng = (float)$row['field_longitude_value'];
        $venue->nid = $row['nid'];
        $venue->phone = $row['field_phone_value'];
        $venue->distance = round(calculateDistance($curLat,$curLng,$venue->lat,$venue->lng,"M"),3);
        //only push this venue if the distance is inside the radius
        if($venue->distance < $radius){
          //check to see if this venue has any deals for today
          $hasDeal = $db->query('SELECT field_deal_summary_value FROM node__field_deal_summary WHERE entity_id IN (SELECT day.entity_id FROM node__field_day_of_week AS day JOIN node__field_venue AS venue ON day.entity_id = venue.entity_id WHERE field_day_of_week_target_id = '.$day.' AND field_venue_target_id = '.$venue->nid.')');


            $venueDeals = array();
            while($deal = $hasDeal->fetchAssoc()){
              //if it does, push them into an Array, we add the BR so the lines wrap on the map
              $venueDeals[]=$deal['field_deal_summary_value']."<br>";
            }
          if(!empty($venueDeals)){
            //then set this venue deal summary to that array
            $venue->dealsum = implode(",", $venueDeals);
          }else{
            $venue->dealsum = "No deals today.";
          }
          //then push this venue into the venues array
          $venues[] = $venue;
        }
      }
    }

    $response = new Response();
    $response->setContent(json_encode($venues));
    return $response;

    //return array(
     // '#type' => 'markup',
    //  '#markup' => $this->t('wtf'),
   // );
  }

}


  //consider making this function a service later
  //https://www.drupal.org/docs/8/api/services-and-dependency-injection/structure-of-a-service-file
function calculateDistance($lat1, $lon1, $lat2, $lon2, $unit) {

  $theta = $lon1 - $lon2;
  $dist = sin(deg2rad($lat1)) * sin(deg2rad($lat2)) +  cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * cos(deg2rad($theta));
  $dist = acos($dist);
  $dist = rad2deg($dist);
  $miles = $dist * 60 * 1.1515;
  $unit = strtoupper($unit);

  if ($unit == "K") {
    return ($miles * 1.609344);
  } else if ($unit == "N") {
      return ($miles * 0.8684);
    } else {
        return $miles;
      }
}
