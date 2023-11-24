import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Avatar from 'react-avatar';
import { useHistory, useLocation } from 'react-router-dom';
import { authActions } from '../../../redux/actions';
import { userSelectors } from '../../../redux/selectors';
import router from '../../../router';
import LogoutModal from '../../Modals/LogoutModal';

import styles from './styles.module.scss';

function HomeHeader() {
  const name = useSelector(userSelectors.selectUserGivenName);
  const lastName = useSelector(userSelectors.selectUserFamilyName);
  const hiMsg = name && lastName ? `Hi, ${name} ${lastName}!` : 'Hi!';
  const titles = {
    [router.home.profile]: 'My profile',
    [router.home.documents]: 'My documents',
    [router.documents.myAccount]: 'My documents',
    [router.documents.citizenshipHistory]: 'My documents',
    [router.documents.courtCases]: 'My documents',
    [router.documents.landOwnership]: 'My documents',
    [router.home.feed]: hiMsg,
    [router.home.legislation]: 'Legislation',
    [router.home.offices]: 'Offices',
    [router.home.registries]: 'Registries',
    [router.home.staking]: 'Staking',
    [router.home.congress]: 'Congress',
    [router.home.voting]: 'Voting',
    [router.voting.congressionalAssemble]: 'Voting',
    [router.voting.referendum]: 'Voting',
    [router.home.wallet]: 'Wallet',
    [router.wallet.ethBridge]: 'Ethereum Bridge',
    [router.wallet.ethBridgeDeposit]: 'Ethereum Bridge',
    [router.wallet.ethBridgeWithdraw]: 'Ethereum Bridge',
  };
  const dispatch = useDispatch();
  const history = useHistory();
  const location = useLocation();

  const handleLogout = () => {
    dispatch(authActions.signOut.call(history));
    window.location.replace(process.env.REACT_APP_SSO_API_LOGOUT_IMPLICIT_LINK);
  };

  const [isLogoutModalOpen, setLogoutIsModalOpen] = useState(false);

  const fullName = name && lastName ? `${name} ${lastName}` : undefined;
  return (
    <div className={styles.homeHeaderWrapper}>
      <div className={styles.homeHeaderAccountWrapper}>
        <div className={styles.titleWrapper}>
          <span className={styles.headerTitle}>{titles[location.pathname]}</span>
        </div>
        <div className={styles.avatarWrapper}>
          <div className={styles.avatar}>
            <Avatar
              name={fullName}
              round
              onClick={
              () => setLogoutIsModalOpen(true)
              }
              size="47px"
              fgColor="#F1C823"
              color="#FDF4E0"
            />
          </div>
          {isLogoutModalOpen && (
            <LogoutModal handleLogout={handleLogout} closeModal={() => setLogoutIsModalOpen(false)} />
          )}
        </div>
      </div>
    </div>
  );
}

export default HomeHeader;
