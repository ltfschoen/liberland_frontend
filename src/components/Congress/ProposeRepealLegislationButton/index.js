import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useSelector } from 'react-redux';
import Button from '../../Button/Button';
import CongressRepealLegislationFastTrackModal from '../../Modals/CongressRepealLegislationFastTrackModal';
import {
  blockchainSelectors,
  congressSelectors,
} from '../../../redux/selectors';

export default function ProposeRepealLegislationButton({ tier, index }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const handleModalOpen = () => setIsModalOpen(!isModalOpen);

  // requires parent to dispatch getMembers action
  const members = useSelector(congressSelectors.members);
  const user = useSelector(blockchainSelectors.userWalletAddressSelector);

  const userIsMember = members.map((m) => m.toString()).includes(user);
  if (!userIsMember) return null;

  return (
    <>
      <Button medium primary onClick={handleModalOpen}>
        Propose Referendum to repeal
      </Button>
      {isModalOpen && (
        <CongressRepealLegislationFastTrackModal
          closeModal={handleModalOpen}
          tier={tier}
          index={index}
        />
      )}
    </>
  );
}

ProposeRepealLegislationButton.propTypes = {
  tier: PropTypes.string.isRequired,
  index: PropTypes.string.isRequired,
};
